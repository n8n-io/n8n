import type { SelfHealingResultWorkflow } from '@n8n/api-types';

import { suggestion } from './selfHealingResults.test.utils';
import { buildWorkflowTree } from './selfHealingWorkflowTree';

const workflow = (workflowId: string, suggestionId: string | null = null) =>
	({
		workflowId,
		name: workflowId,
		change: suggestionId ? 'modified' : 'unchanged',
		suggestionId,
	}) satisfies SelfHealingResultWorkflow;
const call = (callerWorkflowId: string, calledWorkflowId: string) => ({
	callerWorkflowId,
	calledWorkflowId,
});

function tree(
	workflows: SelfHealingResultWorkflow[],
	calls: Array<ReturnType<typeof call>>,
	workflowIdsWithSuggestions = workflows
		.filter((item) => item.suggestionId)
		.map((item) => item.workflowId),
) {
	const suggestions = workflowIdsWithSuggestions.map((workflowId) =>
		suggestion({ suggestionId: `suggestion-${workflowId}`, workflowId }),
	);
	return buildWorkflowTree({ workflows, calls, suggestions }).map(
		({ workflowId, indent, callerIds, suggestion: item }) => ({
			workflowId,
			indent,
			callerIds,
			changed: item !== undefined,
		}),
	);
}

it('nests the changed workflows below an unchanged middle workflow', () => {
	expect(
		tree(
			[workflow('root'), workflow('middle'), workflow('leaf', 'suggestion-leaf')],
			[call('root', 'middle'), call('middle', 'leaf')],
		),
	).toEqual([
		{ workflowId: 'root', indent: 0, callerIds: [], changed: false },
		{ workflowId: 'middle', indent: 1, callerIds: ['root'], changed: false },
		{ workflowId: 'leaf', indent: 2, callerIds: ['middle'], changed: true },
	]);
});

it('lists a shared sub-workflow once, below its nearest caller, with every caller', () => {
	expect(
		tree(
			[workflow('root', 's'), workflow('a'), workflow('shared', 's'), workflow('b')],
			[call('root', 'a'), call('root', 'shared'), call('root', 'b'), call('a', 'shared')],
		),
	).toEqual([
		{ workflowId: 'root', indent: 0, callerIds: [], changed: true },
		{ workflowId: 'a', indent: 1, callerIds: ['root'], changed: false },
		{ workflowId: 'shared', indent: 1, callerIds: ['root', 'a'], changed: true },
		{ workflowId: 'b', indent: 1, callerIds: ['root'], changed: false },
	]);
});

it('stops at a cycle and ignores a call to the same workflow', () => {
	expect(
		tree(
			[workflow('root', 's'), workflow('child', 's')],
			[call('root', 'child'), call('child', 'root'), call('child', 'child')],
		),
	).toEqual([
		{ workflowId: 'root', indent: 0, callerIds: ['child'], changed: true },
		{ workflowId: 'child', indent: 1, callerIds: ['root'], changed: true },
	]);
});

it('lists a changed workflow without a known caller at the top level', () => {
	expect(
		tree([workflow('root', 's'), workflow('orphan', 's')], [call('elsewhere', 'orphan')]),
	).toEqual([
		{ workflowId: 'root', indent: 0, callerIds: [], changed: true },
		{ workflowId: 'orphan', indent: 0, callerIds: [], changed: true },
	]);
});

it('keeps a suggestion whose workflow is not listed', () => {
	expect(tree([workflow('root')], [], ['root', 'hidden'])).toEqual([
		{ workflowId: 'root', indent: 0, callerIds: [], changed: true },
		{ workflowId: 'hidden', indent: 0, callerIds: [], changed: true },
	]);
});
