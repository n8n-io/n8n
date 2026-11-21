"""Job bookkeeping: run records in collection_runs and a database lock per job."""

import logging
import os
import socket
import traceback
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from sqlalchemy import Engine, or_, select, update

from footintel.db.models import CollectionRun, DataQualityIssue, ScheduledJob
from footintel.db.session import session_scope
from footintel.logging_setup import mask_secrets

log = logging.getLogger(__name__)


class JobAlreadyRunning(Exception):
    pass


@dataclass
class RunStats:
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    issues: list[tuple[str, str, str, int | None]] = field(default_factory=list)

    def issue(self, severity: str, code: str, message: str, match_id: int | None = None) -> None:
        self.issues.append((severity, code, message, match_id))


def _owner() -> str:
    return f"{socket.gethostname()}:{os.getpid()}"


def acquire_lock(engine: Engine, job_name: str, ttl: timedelta) -> str:
    owner = _owner()
    now = datetime.now(UTC)
    with session_scope(engine) as s:
        if s.scalar(select(ScheduledJob).where(ScheduledJob.name == job_name)) is None:
            s.add(ScheduledJob(name=job_name))
    with session_scope(engine) as s:
        # Single conditional UPDATE: only one process can win the lock.
        result = s.execute(
            update(ScheduledJob)
            .where(
                ScheduledJob.name == job_name,
                or_(ScheduledJob.lock_owner.is_(None), ScheduledJob.lock_expires_at < now),
            )
            .values(lock_owner=owner, lock_expires_at=now + ttl, last_started_at=now)
        )
        if result.rowcount != 1:
            raise JobAlreadyRunning(f"Job {job_name!r} is already running")
    return owner


def release_lock(engine: Engine, job_name: str, owner: str, status: str) -> None:
    with session_scope(engine) as s:
        s.execute(
            update(ScheduledJob)
            .where(ScheduledJob.name == job_name, ScheduledJob.lock_owner == owner)
            .values(
                lock_owner=None,
                lock_expires_at=None,
                last_finished_at=datetime.now(UTC),
                last_status=status,
            )
        )


@contextmanager
def tracked_run(
    engine: Engine,
    job_name: str,
    *,
    source_id: int | None = None,
    params: dict | None = None,
    lock_ttl: timedelta = timedelta(hours=2),
) -> Iterator[RunStats]:
    """Lock the job, record a collection run, and store the outcome even on failure."""
    owner = acquire_lock(engine, job_name, lock_ttl)
    with session_scope(engine) as s:
        run = CollectionRun(
            job_name=job_name,
            source_id=source_id,
            started_at=datetime.now(UTC),
            status="running",
            params=params,
        )
        s.add(run)
        s.flush()
        run_id = run.id
    stats = RunStats()
    status, error = "success", None
    try:
        yield stats
    except Exception as exc:
        status = "failed"
        error = mask_secrets("".join(traceback.format_exception_only(type(exc), exc)).strip())
        log.error("Job %s failed: %s", job_name, error)
        raise
    finally:
        if status == "success" and any(sev == "error" for sev, *_ in stats.issues):
            status = "partial"
        with session_scope(engine) as s:
            run = s.get(CollectionRun, run_id)
            run.finished_at = datetime.now(UTC)
            run.status = status
            run.error = error
            run.rows_inserted, run.rows_updated, run.rows_skipped = (
                stats.inserted,
                stats.updated,
                stats.skipped,
            )
            for severity, code, message, match_id in stats.issues:
                s.add(
                    DataQualityIssue(
                        collection_run_id=run_id,
                        match_id=match_id,
                        severity=severity,
                        code=code,
                        message=message,
                    )
                )
        release_lock(engine, job_name, owner, status)
        log.info(
            "Job %s %s: +%d ~%d =%d, %d issue(s)",
            job_name, status, stats.inserted, stats.updated, stats.skipped, len(stats.issues),
        )
