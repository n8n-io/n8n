import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Executions enqueued longer ago than this are considered abandoned. Kept generous so
 * a rolling deploy cannot crash an execution a worker is legitimately about to pick
 * up - during an upgrade a `new` row may be seconds old and perfectly healthy.
 * Inlined rather than imported, since a migration is a snapshot.
 */
const MAX_ENQUEUED_EXECUTION_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Clears the backlog of executions abandoned in the `new` (enqueued) status.
 *
 * Until this release nothing moved an enqueued execution out of `new` after a
 * restart, so every shutdown mid-enqueue leaked a row that sits at "Queued" in the
 * UI forever. Startup recovery now replays such executions, but replaying work
 * enqueued before a week-long gap would run against long-stale trigger data, so the
 * accumulated rows are surfaced as `crashed` - visible and retryable - instead.
 *
 * This runs as a migration rather than at startup because the backlog is a one-time
 * artifact of the bug. Queue mode leaves these rows untouched because enqueued
 * executions are owned by workers.
 *
 * Irreversible: a `down()` cannot tell the rows crashed here apart from those that
 * crashed on their own.
 */
export class CrashStaleEnqueuedExecutions1785247194306 implements IrreversibleMigration {
	async up({ escape, runQuery, logger, migrationName }: MigrationContext) {
		if (Container.get(GlobalConfig).executions.mode === 'queue') {
			logger.info(`[${migrationName}] Skipping stale enqueued execution cleanup in queue mode`);
			return;
		}

		const table = escape.tableName('execution_entity');
		const status = escape.columnName('status');
		const createdAt = escape.columnName('createdAt');
		const stoppedAt = escape.columnName('stoppedAt');
		const waitTill = escape.columnName('waitTill');

		const now = new Date();
		const cutoff = new Date(now.getTime() - MAX_ENQUEUED_EXECUTION_AGE_MS);
		const staleCondition = `${status} = 'new' AND ${createdAt} < :cutoff`;

		// Counted up front because `runQuery` surfaces no affected-row count, and an
		// operator upgrading a long-broken instance needs to see how many were flipped.
		const rows = await runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS count FROM ${table} WHERE ${staleCondition}`,
			{ cutoff },
		);
		const staleCount = Number(rows[0].count);

		if (staleCount === 0) return;

		// `startedAt` stays null: these executions never ran. `waitTill` is cleared so
		// nothing can pick a crashed row back up.
		await runQuery(
			`UPDATE ${table}
			 SET ${status} = 'crashed', ${stoppedAt} = :now, ${waitTill} = NULL
			 WHERE ${staleCondition}`,
			{ now, cutoff },
		);

		logger.info(
			`[${migrationName}] Marked ${staleCount} execution(s) enqueued before ${cutoff.toISOString()} as crashed`,
		);
	}
}
