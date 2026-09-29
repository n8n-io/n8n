import { GlobalConfig } from '@n8n/config';
import { mintPolicyCleared } from '@n8n/decorators/policy-internal';
import { mock } from 'vitest-mock-extended';
import { calculateWorkflowChecksum } from 'n8n-workflow';

import { WorkflowEntity } from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { mockInstance } from '../../utils/test-utils/mock-instance';
import { FolderRepository } from '../folder.repository';
import { SharedWorkflowRepository } from '../shared-workflow.repository';
import { WorkflowHistoryRepository } from '../workflow-history.repository';
import { WorkflowRepository } from '../workflow.repository';

describe('WorkflowRepository.updateContent', () => {
	const entityManager = mockEntityManager(WorkflowEntity);
	const transactionRunner = mock<TransactionRunner>();
	const workflowRepository = new WorkflowRepository(
		entityManager.connection,
		mockInstance(GlobalConfig, { database: { type: 'postgresdb' } }),
		mockInstance(FolderRepository),
		mockInstance(SharedWorkflowRepository),
		mockInstance(WorkflowHistoryRepository),
		transactionRunner,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		transactionRunner.run.mockImplementation(async (ctx, run) => await run(ctx));
	});

	// The load-bearing red: the write must reach the manager only past the clearance gate.
	it('writes the content through the resolved manager when the clearance matches', async () => {
		const cleared = mintPolicyCleared({
			point: 'workflowSave',
			subject: { type: 'workflow', id: 'wf-1' },
			decision: { violations: [] },
		});

		await workflowRepository.updateContent('wf-1', { name: 'renamed' }, { policyCleared: cleared });

		expect(entityManager.update).toHaveBeenCalledWith(WorkflowEntity, 'wf-1', { name: 'renamed' });
	});

	it('throws and writes nothing when the context carries no clearance', async () => {
		await expect(
			workflowRepository.updateContent('wf-1', { name: 'renamed' }, {}),
		).rejects.toThrow();

		expect(entityManager.update).not.toHaveBeenCalled();
	});

	// The gate binds the assert to the id being written, not just to any clearance on the context.
	it('throws and writes nothing when the clearance is for a different workflow', async () => {
		const cleared = mintPolicyCleared({
			point: 'workflowSave',
			subject: { type: 'workflow', id: 'wf-1' },
			decision: { violations: [] },
		});

		await expect(
			workflowRepository.updateContent('wf-2', { name: 'renamed' }, { policyCleared: cleared }),
		).rejects.toThrow();

		expect(entityManager.update).not.toHaveBeenCalled();
	});
	it.each(['postgres', 'sqlite-pooled'])(
		'checks the locked workflow before a guarded write on %s',
		async (type) => {
			Object.assign(entityManager.connection, { options: { type } });
			const workflow = mock<WorkflowEntity>({
				name: 'Original',
				nodes: [],
				connections: {},
				settings: {},
			});
			entityManager.findOne.mockResolvedValue(workflow);
			const cleared = mintPolicyCleared({
				point: 'workflowSave',
				subject: { type: 'workflow', id: 'wf-1' },
				decision: { violations: [] },
			});
			const checksum = await calculateWorkflowChecksum(workflow);
			expect(
				await workflowRepository.updateContent(
					'wf-1',
					{ name: 'Changed' },
					{ policyCleared: cleared },
					checksum,
				),
			).toBe(true);
			expect(entityManager.findOne).toHaveBeenCalledWith(WorkflowEntity, {
				where: { id: 'wf-1' },
				...(type === 'postgres' ? { lock: { mode: 'for_no_key_update' } } : {}),
			});
			expect(entityManager.update).toHaveBeenCalledOnce();
		},
	);

	it.each([
		{ name: 'Renamed' },
		{ connections: { Source: { main: [[{ node: 'Destination', type: 'main', index: 0 }]] } } },
		{ settings: { executionTimeout: 30 } },
		{ activeVersionId: 'new-publication' },
	])('does not overwrite a workflow changed after preparation: %j', async (change) => {
		Object.assign(entityManager.connection, { options: { type: 'postgres' } });
		const workflow = mock<WorkflowEntity>({
			name: 'Original',
			nodes: [],
			connections: {},
			settings: {},
			activeVersionId: 'original-publication',
		});
		const checksum = await calculateWorkflowChecksum(workflow);
		entityManager.findOne.mockResolvedValue(Object.assign(workflow, change));
		const cleared = mintPolicyCleared({
			point: 'workflowSave',
			subject: { type: 'workflow', id: 'wf-1' },
			decision: { violations: [] },
		});
		expect(
			await workflowRepository.updateContent(
				'wf-1',
				{ name: 'Changed' },
				{ policyCleared: cleared },
				checksum,
			),
		).toBe(false);
		expect(entityManager.update).not.toHaveBeenCalled();
	});
});
