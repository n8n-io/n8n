"""Scheduled cycles (APScheduler). Times are in TIMEZONE, Africa/Lubumbashi by default.

Manual runs stay possible at any time with `footintel run <cycle>`; the database
locks stop a manual run and a scheduled run of the same job from overlapping.
"""

import logging
import os

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from footintel import pipeline
from footintel.config import Settings
from footintel.db.session import get_engine

log = logging.getLogger(__name__)

# cycle -> cron expression (minute hour day month day_of_week). Override with env vars,
# e.g. SCHEDULE_EVENING="30 0 * * *".
DEFAULT_SCHEDULE = {
    "morning": "0 9 * * *",
    "evening": "30 23 * * *",
    "nightly": "0 3 * * *",
    "weekly": "0 4 * * mon",
}

CYCLES = {"morning": pipeline.morning, "evening": pipeline.evening,
          "nightly": pipeline.nightly, "weekly": pipeline.weekly}


def run_scheduler(settings: Settings) -> None:
    engine = get_engine()
    scheduler = BlockingScheduler(timezone=settings.timezone)
    for name, default in DEFAULT_SCHEDULE.items():
        expr = os.environ.get(f"SCHEDULE_{name.upper()}", default)
        scheduler.add_job(CYCLES[name], CronTrigger.from_crontab(expr, timezone=settings.timezone),
                          args=[engine, settings], id=name, max_instances=1, coalesce=True,
                          misfire_grace_time=3600)
        log.info("Scheduled %s at '%s' (%s)", name, expr, settings.timezone)
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Scheduler stopped")
