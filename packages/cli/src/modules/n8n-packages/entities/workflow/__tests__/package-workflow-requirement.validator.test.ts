import type { User, WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { PackageExportBlockedError } from '../../package-export.errors';
import { PackageWorkflowRequirementValidator } from '../package-workflow-requirement.validator';

const user = mock<User>({ id: 'user-1' });

function makeWorkflow(id: string, subWorkflowIds: string[] = []): WorkflowEntity {
	return {
		id,
		nodes: subWorkflowIds.map((subWorkflowId, index) =>
			executeWorkflowNode(subWorkflowId, { id: `execute-${index}` }),
		),
	} as WorkflowEntity;
}

function executeWorkflowNode(subWorkflowId: string, overrides: Partial<INode> = {}): INode {
	return {
		id: 'execute-workflow',
		name: 'Execute Workflow',
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1,
		position: [0, 0],
		parameters: {
			workflowId: { __rl: true, mode: 'list', value: subWorkflowId },
		},
		...overrides,
	};
}

function makeValidator(workflows: WorkflowEntity[]) {
	const workflowFinder = mock<WorkflowFinderService>();
	const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
	workflowFinder.findWorkflowForUser.mockImplementation(async (workflowId) => {
		return workflowsById.get(workflowId) ?? null;
	});

	return {
		validator: new PackageWorkflowRequirementValidator(workflowFinder),
		workflowFinder,
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});

	return { promise, resolve };
}

describe('PackageWorkflowRequirementValidator', () => {
	it('fetches exported workflows one at a time', async () => {
		const workflowFinder = mock<WorkflowFinderService>();
		const firstFetch = deferred<WorkflowEntity | null>();
		workflowFinder.findWorkflowForUser.mockImplementation(async (workflowId) => {
			if (workflowId === 'wf-a') return await firstFetch.promise;

			return makeWorkflow(workflowId);
		});
		const validator = new PackageWorkflowRequirementValidator(workflowFinder);

		const validation = validator.validateStaticSubWorkflowsIncluded(
			user,
			new Set(['wf-a', 'wf-b']),
		);
		await Promise.resolve();

		expect(workflowFinder.findWorkflowForUser).toHaveBeenCalledTimes(1);

		firstFetch.resolve(makeWorkflow('wf-a'));
		await validation;

		expect(workflowFinder.findWorkflowForUser.mock.calls.map(([workflowId]) => workflowId)).toEqual(
			['wf-a', 'wf-b'],
		);
	});

	it('allows complete static sub-workflow dependency sets', async () => {
		const { validator } = makeValidator([
			makeWorkflow('wf-parent', ['wf-child']),
			makeWorkflow('wf-child'),
		]);

		await expect(
			validator.validateStaticSubWorkflowsIncluded(user, new Set(['wf-parent', 'wf-child'])),
		).resolves.toBeUndefined();
	});

	it('blocks missing static sub-workflow dependencies', async () => {
		const { validator } = makeValidator([makeWorkflow('wf-parent', ['wf-child'])]);

		await expect(
			validator.validateStaticSubWorkflowsIncluded(user, new Set(['wf-parent'])),
		).rejects.toThrow(PackageExportBlockedError);
		await expect(
			validator.validateStaticSubWorkflowsIncluded(user, new Set(['wf-parent'])),
		).rejects.toThrow('1 sub-workflow dependency not included in the package. Export aborted.');
	});

	it('dedupes missing static sub-workflow dependencies', async () => {
		const { validator } = makeValidator([
			makeWorkflow('wf-parent-a', ['wf-child']),
			makeWorkflow('wf-parent-b', ['wf-child']),
		]);

		await expect(
			validator.validateStaticSubWorkflowsIncluded(user, new Set(['wf-parent-a', 'wf-parent-b'])),
		).rejects.toThrow('1 sub-workflow dependency not included in the package. Export aborted.');
	});

	it('ignores dynamic sub-workflow references', async () => {
		const workflow = {
			id: 'wf-parent',
			nodes: [
				{
					...executeWorkflowNode('wf-child'),
					parameters: { workflowId: '={{ $json.workflowId }}' },
				},
			],
		} as unknown as WorkflowEntity;
		const { validator } = makeValidator([workflow]);

		await expect(
			validator.validateStaticSubWorkflowsIncluded(user, new Set(['wf-parent'])),
		).resolves.toBeUndefined();
	});

	it('allows circular references when all workflows are included', async () => {
		const { validator } = makeValidator([
			makeWorkflow('wf-a', ['wf-b']),
			makeWorkflow('wf-b', ['wf-a']),
		]);

		await expect(
			validator.validateStaticSubWorkflowsIncluded(user, new Set(['wf-a', 'wf-b'])),
		).resolves.toBeUndefined();
	});
});
