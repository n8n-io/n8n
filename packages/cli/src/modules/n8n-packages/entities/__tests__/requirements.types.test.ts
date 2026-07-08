import type { WorkflowCredentialRequirement } from '../credential/credential.types';
import type { WorkflowSubWorkflowRequirement } from '../requirements.types';
import { mergeRequirements, toPackageSubWorkflowRequirements } from '../requirements.types';

function cred(credentialId: string, workflowId: string): WorkflowCredentialRequirement {
	return {
		workflowId,
		credentialId,
		credentialName: `Cred ${credentialId}`,
		credentialType: 'httpHeaderAuth',
	};
}

function subWorkflow(
	subWorkflowId: string,
	name: string,
	workflowId: string,
): WorkflowSubWorkflowRequirement {
	return { subWorkflowId, name, workflowId };
}

describe('mergeRequirements', () => {
	it('concatenates credential requirements across parts, preserving order', () => {
		const merged = mergeRequirements(
			{ credentials: [cred('c1', 'w1')] },
			{ credentials: [cred('c2', 'w2'), cred('c3', 'w3')] },
		);

		expect(merged.credentials).toEqual([cred('c1', 'w1'), cred('c2', 'w2'), cred('c3', 'w3')]);
	});

	it('skips undefined parts so optional export results can be passed directly', () => {
		const merged = mergeRequirements(undefined, { credentials: [cred('c1', 'w1')] }, undefined);

		expect(merged.credentials).toEqual([cred('c1', 'w1')]);
	});

	it('concatenates sub-workflow requirements across parts, preserving order', () => {
		const merged = mergeRequirements(
			{
				credentials: [],
				subWorkflows: [
					subWorkflow('sub-1', 'Shared child', 'wf-a'),
					subWorkflow('sub-1', 'Shared child', 'wf-b'),
					subWorkflow('sub-2', 'Other child', 'wf-a'),
				],
			},
			{
				credentials: [],
				subWorkflows: [
					subWorkflow('sub-1', 'Shared child', 'wf-b'),
					subWorkflow('sub-1', 'Shared child', 'wf-c'),
					subWorkflow('sub-3', 'Third child', 'wf-d'),
				],
			},
		);

		expect(merged.subWorkflows).toEqual([
			subWorkflow('sub-1', 'Shared child', 'wf-a'),
			subWorkflow('sub-1', 'Shared child', 'wf-b'),
			subWorkflow('sub-2', 'Other child', 'wf-a'),
			subWorkflow('sub-1', 'Shared child', 'wf-b'),
			subWorkflow('sub-1', 'Shared child', 'wf-c'),
			subWorkflow('sub-3', 'Third child', 'wf-d'),
		]);
	});

	it('returns empty requirement lists when given no parts', () => {
		expect(mergeRequirements()).toEqual({ credentials: [], subWorkflows: [] });
	});
});

describe('toPackageSubWorkflowRequirements', () => {
	it('aggregates callers for repeated sub-workflow requirements', () => {
		const requirements = toPackageSubWorkflowRequirements([
			subWorkflow('sub-1', 'Shared child', 'wf-a'),
			subWorkflow('sub-1', 'Shared child', 'wf-b'),
			subWorkflow('sub-2', 'Other child', 'wf-a'),
			subWorkflow('sub-1', 'Shared child', 'wf-b'),
			subWorkflow('sub-1', 'Shared child', 'wf-c'),
			subWorkflow('sub-3', 'Third child', 'wf-d'),
		]);

		expect(requirements).toEqual([
			{ id: 'sub-1', name: 'Shared child', usedByWorkflows: ['wf-a', 'wf-b', 'wf-c'] },
			{ id: 'sub-2', name: 'Other child', usedByWorkflows: ['wf-a'] },
			{ id: 'sub-3', name: 'Third child', usedByWorkflows: ['wf-d'] },
		]);
	});
});
