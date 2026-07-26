import type { User, WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowDependencyResolver } from '../workflow-dependency-resolver';
import { WorkflowRequirementsExtractor } from '../workflow-requirements.extractor';

const user = mock<User>({ id: 'user-1' });

function makeWorkflow(id: string, referencedWorkflowIds: string | string[] = []): WorkflowEntity {
	const ids = Array.isArray(referencedWorkflowIds)
		? referencedWorkflowIds
		: [referencedWorkflowIds];
	const nodes: INode[] = ids.map((referencedWorkflowId) => ({
		id: `execute-${referencedWorkflowId}`,
		name: 'Execute Workflow',
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1,
		position: [0, 0],
		parameters: {
			workflowId: { __rl: true, mode: 'list', value: referencedWorkflowId },
		},
	}));

	return { id, nodes } as WorkflowEntity;
}

function makeResolver(workflows: WorkflowEntity[]) {
	const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
	const workflowFinder = mock<WorkflowFinderService>();
	workflowFinder.findWorkflowsByIdsForUser.mockImplementation(async (workflowIds) =>
		workflowIds
			.map((workflowId) => workflowsById.get(workflowId))
			.filter((workflow): workflow is WorkflowEntity => workflow !== undefined),
	);

	return {
		resolver: new WorkflowDependencyResolver(workflowFinder, new WorkflowRequirementsExtractor()),
		workflowFinder,
	};
}

describe('WorkflowDependencyResolver', () => {
	it('traverses nested sub-workflow dependencies', async () => {
		const { resolver } = makeResolver([
			makeWorkflow('workflow-a', 'workflow-b'),
			makeWorkflow('workflow-b', 'workflow-c'),
			makeWorkflow('workflow-c'),
		]);

		const requirements = await resolver.resolve({ user, workflowIds: ['workflow-a'] });

		expect(requirements).toEqual([
			{ workflowId: 'workflow-a', referencedWorkflowId: 'workflow-b' },
			{ workflowId: 'workflow-b', referencedWorkflowId: 'workflow-c' },
		]);
	});

	it('handles circular dependencies without revisiting workflows', async () => {
		const { resolver, workflowFinder } = makeResolver([
			makeWorkflow('workflow-a', 'workflow-b'),
			makeWorkflow('workflow-b', 'workflow-a'),
		]);

		const requirements = await resolver.resolve({ user, workflowIds: ['workflow-a'] });

		expect(requirements).toEqual([
			{ workflowId: 'workflow-a', referencedWorkflowId: 'workflow-b' },
			{ workflowId: 'workflow-b', referencedWorkflowId: 'workflow-a' },
		]);
		expect(workflowFinder.findWorkflowsByIdsForUser).toHaveBeenCalledTimes(2);
	});

	it('keeps missing or inaccessible dependencies as requirements but does not traverse them', async () => {
		const { resolver, workflowFinder } = makeResolver([makeWorkflow('workflow-a', 'workflow-b')]);

		const requirements = await resolver.resolve({ user, workflowIds: ['workflow-a'] });

		expect(requirements).toEqual([
			{ workflowId: 'workflow-a', referencedWorkflowId: 'workflow-b' },
		]);
		expect(workflowFinder.findWorkflowsByIdsForUser).toHaveBeenCalledWith(['workflow-b'], user, [
			'workflow:export',
		]);
	});

	it('resolves a complex graph with fan-out, cycles, convergence, and inaccessible dependencies', async () => {
		// a → b, a → c
		// c → b, c → d (d inaccessible)
		// b → e, e → b
		const { resolver, workflowFinder } = makeResolver([
			makeWorkflow('workflow-a', ['workflow-b', 'workflow-c']),
			makeWorkflow('workflow-b', 'workflow-e'),
			makeWorkflow('workflow-c', ['workflow-b', 'workflow-d']),
			makeWorkflow('workflow-e', 'workflow-b'),
		]);

		const requirements = await resolver.resolve({ user, workflowIds: ['workflow-a'] });

		expect(requirements).toEqual([
			{ workflowId: 'workflow-a', referencedWorkflowId: 'workflow-b' },
			{ workflowId: 'workflow-a', referencedWorkflowId: 'workflow-c' },
			{ workflowId: 'workflow-b', referencedWorkflowId: 'workflow-e' },
			{ workflowId: 'workflow-c', referencedWorkflowId: 'workflow-b' },
			{ workflowId: 'workflow-c', referencedWorkflowId: 'workflow-d' },
			{ workflowId: 'workflow-e', referencedWorkflowId: 'workflow-b' },
		]);
		expect(workflowFinder.findWorkflowsByIdsForUser).toHaveBeenCalledTimes(3);
		expect(workflowFinder.findWorkflowsByIdsForUser).toHaveBeenNthCalledWith(
			1,
			['workflow-a'],
			user,
			['workflow:export'],
		);
		expect(workflowFinder.findWorkflowsByIdsForUser).toHaveBeenNthCalledWith(
			2,
			['workflow-b', 'workflow-c'],
			user,
			['workflow:export'],
		);
		expect(workflowFinder.findWorkflowsByIdsForUser).toHaveBeenNthCalledWith(
			3,
			['workflow-e', 'workflow-d'],
			user,
			['workflow:export'],
		);
	});
});
