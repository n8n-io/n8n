import type {
	ExecutionLedgerEndedFacts,
	ExecutionLedgerStartedFacts,
	WorkflowProjectService,
} from '@n8n/backend-services';
import type { OperationContext, SharedWorkflowRepository, Transaction } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ExecutionLedgerRepository } from '../database/repositories/execution-ledger.repository';
import { ExecutionLedgerRowWriter } from '../execution-ledger-row.writer';

const startedFacts: ExecutionLedgerStartedFacts = {
	executionId: 'exec-1',
	workflowId: 'wf-1',
	workflowName: 'Nightly sync',
	mode: 'trigger',
	occurredAt: new Date('2026-10-30T10:00:00Z'),
};
const endedFacts: ExecutionLedgerEndedFacts = {
	...startedFacts,
	outcome: 'success',
	runtimeMs: 10,
	timeSavedMin: 0,
};

describe('ExecutionLedgerRowWriter', () => {
	const repository = mock<ExecutionLedgerRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const workflowProjectService = mock<WorkflowProjectService>();
	const writer = new ExecutionLedgerRowWriter(
		repository,
		sharedWorkflowRepository,
		workflowProjectService,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		workflowProjectService.getWorkflowProjectCached.mockResolvedValue({ id: 'looked-up' } as never);
	});

	describe.each(['writeStarted', 'writeEnded'] as const)('%s', (method) => {
		const write = async (ctx: OperationContext, projectId?: string) =>
			method === 'writeStarted'
				? await writer.writeStarted({ ...startedFacts, projectId }, ctx)
				: await writer.writeEnded({ ...endedFacts, projectId }, ctx);

		it('uses the project id from the facts and skips the lookup', async () => {
			const trx = mock<Transaction>();

			await expect(write({ trx }, 'given')).resolves.toBe(true);
			await write({}, 'given');

			expect(repository.append).toHaveBeenCalledTimes(2);
			expect(repository.append.mock.calls.map(([row]) => row.projectId)).toEqual([
				'given',
				'given',
			]);
			expect(sharedWorkflowRepository.getWorkflowOwningProjectId).not.toHaveBeenCalled();
			expect(workflowProjectService.getWorkflowProjectCached).not.toHaveBeenCalled();
		});

		it('looks the project id up when the facts have none', async () => {
			await expect(write({})).resolves.toBe(true);

			expect(workflowProjectService.getWorkflowProjectCached).toHaveBeenCalledWith('wf-1');
			expect(repository.append).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'looked-up' }),
				{},
			);
		});

		it('looks the project id up on the transaction when the facts have none', async () => {
			const ctx = { trx: mock<Transaction>() };
			sharedWorkflowRepository.getWorkflowOwningProjectId.mockResolvedValue('owner');

			await expect(write(ctx)).resolves.toBe(true);

			expect(sharedWorkflowRepository.getWorkflowOwningProjectId).toHaveBeenCalledWith('wf-1', ctx);
			expect(workflowProjectService.getWorkflowProjectCached).not.toHaveBeenCalled();
			expect(repository.append).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'owner' }),
				ctx,
			);
		});
	});

	describe('getBacklogStats', () => {
		it('returns the repository result', async () => {
			const stats = { rows: 5, oldestOccurredAt: new Date('2026-10-30T10:00:00Z') };
			repository.getBacklogStats.mockResolvedValue(stats);

			await expect(writer.getBacklogStats()).resolves.toBe(stats);
		});
	});
});
