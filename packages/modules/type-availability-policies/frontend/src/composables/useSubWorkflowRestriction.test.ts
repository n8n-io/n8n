import type { PolicyViolation, SubWorkflowPolicyCheckResponse } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick, ref } from 'vue';

import {
	describeSubWorkflowRestriction,
	getCalledSubWorkflowId,
	useSubWorkflowRestriction,
} from './useSubWorkflowRestriction';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const EXECUTE_WORKFLOW = 'n8n-nodes-base.executeWorkflow';
const SET = 'n8n-nodes-base.set';
const CODE = 'n8n-nodes-base.code';

const executeWorkflowNode = (parameters: Record<string, unknown> = {}) => ({
	type: EXECUTE_WORKFLOW,
	parameters: {
		workflowId: { __rl: true, mode: 'list', value: 'child' },
		...parameters,
	},
});

const violation = (subject: string, scope: string, subjectType = 'nodeType'): PolicyViolation => ({
	kind: 'node-type-unavailable',
	checkId: 'node-type-availability',
	message: `Node type "${subject}" is blocked`,
	subject,
	subjectType,
	scope,
	projectId: 'child-project',
});

function mockChecks(checks: Record<string, SubWorkflowPolicyCheckResponse>) {
	const store = useTypeAvailabilityPoliciesStore();
	const fetchSubWorkflowCheck = vi
		.spyOn(store, 'fetchSubWorkflowCheck')
		.mockResolvedValue(undefined);
	vi.spyOn(store, 'getSubWorkflowCheck').mockImplementation(
		(parentId, subWorkflowId) => checks[`${parentId}:${subWorkflowId}`] ?? null,
	);
	return { fetchSubWorkflowCheck };
}

describe('getCalledSubWorkflowId', () => {
	it('reads the workflow an Execute Workflow node calls from the database', () => {
		expect(getCalledSubWorkflowId(executeWorkflowNode())).toBe('child');
		expect(getCalledSubWorkflowId(executeWorkflowNode({ source: 'database' }))).toBe('child');
	});

	it('reads the plain-string id of an Execute Workflow v1 node', () => {
		expect(getCalledSubWorkflowId(executeWorkflowNode({ workflowId: 'child' }))).toBe('child');
	});

	it.each([
		['an inline sub-workflow', executeWorkflowNode({ source: 'parameter' })],
		['a sub-workflow from a URL', executeWorkflowNode({ source: 'url' })],
		[
			'an expression',
			executeWorkflowNode({ workflowId: { __rl: true, mode: 'id', value: '={{ $json.id }}' } }),
		],
		['a v1 expression', executeWorkflowNode({ workflowId: '={{ $json.id }}' })],
		[
			'no selected workflow',
			executeWorkflowNode({ workflowId: { __rl: true, mode: 'list', value: '' } }),
		],
		[
			'a workflow tool',
			{ ...executeWorkflowNode(), type: '@n8n/n8n-nodes-langchain.toolWorkflow' },
		],
	])('ignores %s', (_, node) => {
		expect(getCalledSubWorkflowId(node)).toBeNull();
	});
});

describe('useSubWorkflowRestriction', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('loads the check and merges the node types the draft and published versions block', async () => {
		const { fetchSubWorkflowCheck } = mockChecks({
			'parent:child': {
				projectName: 'Child project',
				draft: [violation(SET, 'project'), violation('slackApi', 'project', 'credentialType')],
				published: [violation(SET, 'project'), violation(CODE, 'instance')],
			},
		});

		const { restriction, isRestricted } = useSubWorkflowRestriction({
			parentWorkflowId: 'parent',
			node: executeWorkflowNode(),
		});
		await nextTick();

		expect(fetchSubWorkflowCheck).toHaveBeenCalledWith('parent', 'child', { force: false });
		expect(isRestricted.value).toBe(true);
		expect(restriction.value).toEqual({
			violations: [violation(SET, 'project'), violation(CODE, 'instance')],
			projectName: 'Child project',
			blocksDraft: true,
			blocksPublished: true,
		});
	});

	it('lets the draft decide for production runs while the sub-workflow is unpublished', () => {
		mockChecks({ 'parent:child': { draft: [violation(SET, 'project')], published: null } });

		const { restriction } = useSubWorkflowRestriction({
			parentWorkflowId: 'parent',
			node: executeWorkflowNode(),
		});

		expect(restriction.value).toMatchObject({ blocksDraft: true, blocksPublished: true });
	});

	it('is not restricted when no node type blocks the call', () => {
		mockChecks({ 'parent:child': { draft: [], published: null } });

		const { isRestricted } = useSubWorkflowRestriction({
			parentWorkflowId: 'parent',
			node: executeWorkflowNode(),
		});

		expect(isRestricted.value).toBe(false);
	});

	it('forces the first load only when asked to refresh', async () => {
		const { fetchSubWorkflowCheck } = mockChecks({});
		const node = ref(executeWorkflowNode());

		useSubWorkflowRestriction({ parentWorkflowId: 'parent', node, refresh: true });
		node.value = executeWorkflowNode({
			workflowId: { __rl: true, mode: 'list', value: 'other-child' },
		});
		await nextTick();

		expect(fetchSubWorkflowCheck).toHaveBeenNthCalledWith(1, 'parent', 'child', { force: true });
		expect(fetchSubWorkflowCheck).toHaveBeenNthCalledWith(2, 'parent', 'other-child', {
			force: false,
		});
	});

	it('makes no request when disabled or without a parent', () => {
		const { fetchSubWorkflowCheck } = mockChecks({});

		useSubWorkflowRestriction({
			parentWorkflowId: 'parent',
			node: executeWorkflowNode(),
			enabled: false,
		});
		useSubWorkflowRestriction({ parentWorkflowId: undefined, node: executeWorkflowNode() });

		expect(fetchSubWorkflowCheck).not.toHaveBeenCalled();
	});
});

describe('describeSubWorkflowRestriction', () => {
	const labelOf = ({ subject }: PolicyViolation) => (subject === SET ? 'Edit Fields' : undefined);

	it("names each blocking scope, the sub-workflow's project and the runs that fail", () => {
		expect(
			describeSubWorkflowRestriction(
				{
					violations: [violation(SET, 'project'), violation(CODE, 'instance')],
					projectName: 'Child project',
					blocksDraft: true,
					blocksPublished: true,
				},
				labelOf,
			),
		).toEqual([
			'The sub-workflow uses nodes that an administrator blocked.',
			`Restricted on this instance: '${CODE}'.`,
			"Restricted in the sub-workflow's project, Child project: 'Edit Fields'.",
			'Every call to the sub-workflow fails.',
		]);
	});

	it('leaves out a project the user cannot see, and says which runs fail', () => {
		expect(
			describeSubWorkflowRestriction({
				violations: [violation(SET, 'project')],
				blocksDraft: false,
				blocksPublished: true,
			}),
		).toEqual([
			'The sub-workflow uses nodes that an administrator blocked.',
			`Restricted in the sub-workflow's project: '${SET}'.`,
			"Production runs fail, because they call the sub-workflow's published version. Manual runs call the draft and are not affected.",
		]);
	});
});
