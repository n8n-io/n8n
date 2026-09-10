import { GlobalConfig } from '@n8n/config';
import { workflowContentSubject } from '@n8n/decorators';
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

const newWorkflow = (nodes: INode[]) => {
	const workflow = new WorkflowEntity();
	workflow.name = 'My workflow';
	workflow.nodes = nodes;
	return workflow;
};

const clearanceFor = (workflow: WorkflowEntity) =>
	mintPolicyCleared({
		point: 'workflowSave',
		subject: workflowContentSubject(workflow),
		decision: { violations: [] },
	});

describe('WorkflowRepository.createContent', () => {
	const entityManager = mockEntityManager(WorkflowEntity);
	const workflowRepository = new WorkflowRepository(
		entityManager.connection,
		mockInstance(GlobalConfig, { database: { type: 'postgresdb' } }),
		mockInstance(FolderRepository),
		mockInstance(SharedWorkflowRepository),
		mockInstance(WorkflowHistoryRepository),
		mock<TransactionRunner>(),
	);

	// Plain objects, not mocks: the subject is a hash of `JSON.stringify(nodes)`, and a mock
	// proxy does not serialise its properties.
	const nodes = [{ name: 'Start' }] as INode[];

	beforeEach(() => {
		vi.resetAllMocks();
	});

	// The load-bearing red: the write must reach the manager only past the clearance gate.
	it('writes through the resolved manager when the clearance matches the content', async () => {
		const workflow = newWorkflow(nodes);

		await workflowRepository.createContent(workflow, { policyCleared: clearanceFor(workflow) });

		expect(entityManager.save).toHaveBeenCalledWith(workflow);
	});

	it('throws and writes nothing when the context carries no clearance', async () => {
		await expect(workflowRepository.createContent(newWorkflow(nodes), {})).rejects.toThrow();

		expect(entityManager.save).not.toHaveBeenCalled();
	});

	// A new workflow has no id, so the binding is to its nodes — different nodes, different subject.
	it('throws and writes nothing when the clearance is for different content', async () => {
		const cleared = clearanceFor(newWorkflow([{ name: 'Other' }] as INode[]));

		await expect(
			workflowRepository.createContent(newWorkflow(nodes), { policyCleared: cleared }),
		).rejects.toThrow();

		expect(entityManager.save).not.toHaveBeenCalled();
	});

	// Guards the `undefined` id: were it read as present, every create would share one subject.
	it('throws when the clearance is bound to an absent id rather than to the content', async () => {
		const cleared = mintPolicyCleared({
			point: 'workflowSave',
			subject: { type: 'workflow', id: undefined as unknown as string },
			decision: { violations: [] },
		});

		await expect(
			workflowRepository.createContent(newWorkflow(nodes), { policyCleared: cleared }),
		).rejects.toThrow();

		expect(entityManager.save).not.toHaveBeenCalled();
	});

	// A create binds to content even with a client-supplied id: the id is no proof of what was
	// checked, so a content clearance unlocks the write and an id clearance does not.
	it('binds to content, not the id, when the caller supplied one', async () => {
		const workflow = newWorkflow(nodes);
		workflow.id = 'wf-1';

		await workflowRepository.createContent(workflow, { policyCleared: clearanceFor(workflow) });

		expect(entityManager.save).toHaveBeenCalledWith(workflow);
	});

	it('throws when the clearance binds to the supplied id rather than the content', async () => {
		const workflow = newWorkflow(nodes);
		workflow.id = 'wf-1';

		await expect(
			workflowRepository.createContent(workflow, {
				policyCleared: mintPolicyCleared({
					point: 'workflowSave',
					subject: { type: 'workflow', id: 'wf-1' },
					decision: { violations: [] },
				}),
			}),
		).rejects.toThrow();

		expect(entityManager.save).not.toHaveBeenCalled();
	});
});
