import { AddAgentExecutionCount1783000000002 } from './1783000000002-AddAgentExecutionCount';
import type { MigrationContext } from '../migration-types';

describe('AddAgentExecutionCount1783000000002', () => {
	const runQuery = jest.fn();
	const migration = new AddAgentExecutionCount1783000000002();

	const context = {
		escape: {
			tableName: (name: string) => `"${name}"`,
			columnName: (name: string) => `"${name}"`,
		},
		runQuery,
	} as unknown as MigrationContext;

	beforeEach(() => {
		runQuery.mockReset();
	});

	it('adds and backfills the executionCount column from persisted agent executions', async () => {
		await migration.up(context);

		expect(runQuery).toHaveBeenNthCalledWith(
			1,
			'ALTER TABLE "agents" ADD COLUMN "executionCount" BIGINT NOT NULL DEFAULT 0',
		);
		expect(runQuery).toHaveBeenNthCalledWith(
			2,
			expect.stringContaining('COUNT(*) AS "executionCount"'),
		);
		expect(runQuery.mock.calls[1][0]).toContain('FROM "agent_execution" ae');
		expect(runQuery.mock.calls[1][0]).toContain(
			'JOIN "agent_execution_threads" aet ON aet."id" = ae."threadId"',
		);
		expect(runQuery.mock.calls[1][0]).toContain('WHERE "agents"."id" = counts."agentId"');
	});

	it('drops the executionCount column on rollback', async () => {
		await migration.down(context);

		expect(runQuery).toHaveBeenCalledWith('ALTER TABLE "agents" DROP COLUMN "executionCount"');
	});
});
