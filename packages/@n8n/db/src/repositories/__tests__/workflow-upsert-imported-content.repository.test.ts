import { GlobalConfig } from '@n8n/config';
import type { EnforcementPoint } from '@n8n/decorators';
import { workflowSubject } from '@n8n/decorators';
import { mintPolicyCleared } from '@n8n/decorators/policy-internal';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { WorkflowEntity } from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { mockInstance } from '../../utils/test-utils/mock-instance';
import { FolderRepository } from '../folder.repository';
import { SharedWorkflowRepository } from '../shared-workflow.repository';
import { WorkflowHistoryRepository } from '../workflow-history.repository';
import { WorkflowRepository } from '../workflow.repository';

// Plain objects, not mocks: the subject is a hash of `JSON.stringify(nodes)`, and a mock
// proxy does not serialise its properties.
const nodes = [{ name: 'Start' }] as INode[];

const clearanceFor = (
	content: { id?: string; nodes: INode[] },
	point: EnforcementPoint = 'contentImport',
) =>
	mintPolicyCleared({
		point,
		subject: workflowSubject({ id: content.id ?? null, nodes: content.nodes }),
		decision: { violations: [] },
	});

describe('WorkflowRepository.upsertImportedContent', () => {
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
		entityManager.upsert.mockResolvedValue({
			identifiers: [{ id: 'wf-1' }],
			generatedMaps: [],
			raw: [],
		});
	});

	// The load-bearing red: the write must reach the manager only past the clearance gate.
	it('writes through the resolved manager and returns the row id', async () => {
		const content = { id: 'wf-1', name: 'Imported', nodes };

		const id = await workflowRepository.upsertImportedContent(content, {
			policyCleared: clearanceFor(content),
		});

		expect(entityManager.upsert).toHaveBeenCalledWith(WorkflowEntity, content, ['id']);
		expect(id).toBe('wf-1');
	});

	it('throws and writes nothing when the context carries no clearance', async () => {
		await expect(
			workflowRepository.upsertImportedContent({ name: 'Imported', nodes }, {}),
		).rejects.toThrow();

		expect(entityManager.upsert).not.toHaveBeenCalled();
	});

	// An import that supplies no id binds to its nodes, so each workflow in a batch gets its own
	// subject rather than every new one sharing an absent id.
	it('throws and writes nothing when the clearance is for different content', async () => {
		const cleared = clearanceFor({ nodes: [{ name: 'Other' }] as INode[] });

		await expect(
			workflowRepository.upsertImportedContent(
				{ name: 'Imported', nodes },
				{ policyCleared: cleared },
			),
		).rejects.toThrow();

		expect(entityManager.upsert).not.toHaveBeenCalled();
	});

	// An import is not an edit: a save clearance must not unlock the import write.
	it('throws and writes nothing when the clearance is for another enforcement point', async () => {
		const content = { id: 'wf-1', name: 'Imported', nodes };
		const cleared = clearanceFor(content, 'workflowSave');

		await expect(
			workflowRepository.upsertImportedContent(content, { policyCleared: cleared }),
		).rejects.toThrow();

		expect(entityManager.upsert).not.toHaveBeenCalled();
	});

	it('throws when the upsert reports no id', async () => {
		entityManager.upsert.mockResolvedValue({ identifiers: [], generatedMaps: [], raw: [] });
		const content = { id: 'wf-1', name: 'Imported', nodes };

		await expect(
			workflowRepository.upsertImportedContent(content, { policyCleared: clearanceFor(content) }),
		).rejects.toThrow('returned no id');
	});
});
