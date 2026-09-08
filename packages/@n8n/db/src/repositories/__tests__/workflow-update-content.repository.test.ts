import { GlobalConfig } from '@n8n/config';
import { mintPolicyCleared } from '@n8n/decorators/policy-internal';
import { mock } from 'vitest-mock-extended';

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
	const workflowRepository = new WorkflowRepository(
		entityManager.connection,
		mockInstance(GlobalConfig, { database: { type: 'postgresdb' } }),
		mockInstance(FolderRepository),
		mockInstance(SharedWorkflowRepository),
		mockInstance(WorkflowHistoryRepository),
		mock<TransactionRunner>(),
	);

	beforeEach(() => {
		vi.resetAllMocks();
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
});
