import type { WorkflowProjectService } from '@n8n/backend-services';
import type { SharedWorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ExecutionLedgerRepository } from '../database/repositories/execution-ledger.repository';
import { ExecutionLedgerRowWriter } from '../execution-ledger-row.writer';

describe('ExecutionLedgerRowWriter', () => {
	describe('getBacklogStats', () => {
		it('returns the repository result', async () => {
			const repository = mock<ExecutionLedgerRepository>();
			const stats = { rows: 5, oldestOccurredAt: new Date('2026-10-30T10:00:00Z') };
			repository.getBacklogStats.mockResolvedValue(stats);
			const writer = new ExecutionLedgerRowWriter(
				repository,
				mock<SharedWorkflowRepository>(),
				mock<WorkflowProjectService>(),
			);

			await expect(writer.getBacklogStats()).resolves.toBe(stats);
		});
	});
});
