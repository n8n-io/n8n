import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { makeSetupRequest, makeWorkflowSetupSection } from '../__tests__/factories';
import type { WorkflowSetupSection } from '../workflowSetup.types';
import { useWorkflowSetupSteps } from './useWorkflowSetupSteps';

const agent = { name: 'Agent', type: 'agent', typeVersion: 1, id: 'agent-1' };
const agentB = { name: 'Agent B', type: 'agent', typeVersion: 1, id: 'agent-b' };

function harness(sections: WorkflowSetupSection[], setupRequests: InstanceAiWorkflowSetupNode[]) {
	const sectionsRef = computed(() => sections);
	const setupRequestsRef = ref(setupRequests);
	return useWorkflowSetupSteps({ sections: sectionsRef, setupRequests: setupRequestsRef });
}

describe('useWorkflowSetupSteps', () => {
	it('returns an empty list when there are no sections', () => {
		const { steps } = harness([], []);
		expect(steps.value).toEqual([]);
	});

	it('mirrors sections 1:1 when no groupable connections exist', () => {
		const sections = [
			makeWorkflowSetupSection({ id: 'A:slackApi', targetNodeName: 'A' }),
			makeWorkflowSetupSection({ id: 'B:gmailApi', targetNodeName: 'B' }),
		];
		const requests = [
			makeSetupRequest({ node: { name: 'A' } }),
			makeSetupRequest({ node: { name: 'B' } }),
		];
		const { steps } = harness(sections, requests);

		expect(steps.value).toHaveLength(2);
		expect(steps.value.every((s) => s.kind === 'section')).toBe(true);
	});

	it('inserts the group at the first sub-node position when the root node comes after the sub-nodes', () => {
		const sections = [
			makeWorkflowSetupSection({ id: 'Model:openAiApi', targetNodeName: 'Model' }),
			makeWorkflowSetupSection({ id: 'Standalone:slackApi', targetNodeName: 'Standalone' }),
			makeWorkflowSetupSection({ id: 'Agent:foo', targetNodeName: 'Agent' }),
		];
		const requests = [
			makeSetupRequest({ node: { name: 'Model' }, subnodeRootNode: agent }),
			makeSetupRequest({ node: { name: 'Standalone' } }),
			makeSetupRequest({ node: { name: 'Agent' } }),
		];

		const { steps } = harness(sections, requests);

		expect(steps.value).toHaveLength(2);
		const groupStep = steps.value[0];
		if (groupStep.kind !== 'group') throw new Error('expected group step');
		expect(groupStep.group.subnodeRootNode.name).toBe('Agent');
		expect(groupStep.group.subnodeSections.map((s) => s.id)).toEqual(['Model:openAiApi']);
		expect(groupStep.group.rootSection?.id).toBe('Agent:foo');
		const sectionStep = steps.value[1];
		if (sectionStep.kind !== 'section') throw new Error('expected section step');
		expect(sectionStep.section.targetNodeName).toBe('Standalone');
	});

	it('inserts the group at the root node position when the root comes before its sub-nodes', () => {
		const sections = [
			makeWorkflowSetupSection({ id: 'Agent:foo', targetNodeName: 'Agent' }),
			makeWorkflowSetupSection({ id: 'Standalone:slackApi', targetNodeName: 'Standalone' }),
			makeWorkflowSetupSection({ id: 'Model:openAiApi', targetNodeName: 'Model' }),
		];
		const requests = [
			makeSetupRequest({ node: { name: 'Agent' } }),
			makeSetupRequest({ node: { name: 'Standalone' } }),
			makeSetupRequest({ node: { name: 'Model' }, subnodeRootNode: agent }),
		];

		const { steps } = harness(sections, requests);

		expect(steps.value).toHaveLength(2);
		expect(steps.value[0].kind).toBe('group');
		const sectionStep = steps.value[1];
		if (sectionStep.kind !== 'section') throw new Error('expected section step');
		expect(sectionStep.section.targetNodeName).toBe('Standalone');
	});

	it('emits a group with no rootSection when the root node has no setup request', () => {
		const sections = [makeWorkflowSetupSection({ id: 'Model:openAiApi', targetNodeName: 'Model' })];
		const requests = [makeSetupRequest({ node: { name: 'Model' }, subnodeRootNode: agent })];

		const { steps } = harness(sections, requests);

		expect(steps.value).toHaveLength(1);
		const step = steps.value[0];
		if (step.kind !== 'group') throw new Error('expected group');
		expect(step.group.rootSection).toBeUndefined();
		expect(step.group.subnodeSections.map((s) => s.id)).toEqual(['Model:openAiApi']);
		expect(step.group.subnodeRootNode).toEqual(agent);
	});

	it('attaches multiple sections from the same sub-node into subnodeSections', () => {
		const sections = [
			makeWorkflowSetupSection({ id: 'Model:openAiApi', targetNodeName: 'Model' }),
			makeWorkflowSetupSection({
				id: 'Model:parameters',
				targetNodeName: 'Model',
				credentialType: undefined,
				parameterNames: ['temperature'],
			}),
		];
		const requests = [
			makeSetupRequest({ node: { name: 'Model' }, subnodeRootNode: agent }),
			makeSetupRequest({
				node: { name: 'Model' },
				subnodeRootNode: agent,
				credentialType: undefined,
				editableParameters: [{ name: 'temperature', displayName: 'Temperature', type: 'number' }],
			}),
		];

		const { steps } = harness(sections, requests);

		expect(steps.value).toHaveLength(1);
		const step = steps.value[0];
		if (step.kind !== 'group') throw new Error('expected group');
		expect(step.group.subnodeSections.map((s) => s.id)).toEqual([
			'Model:openAiApi',
			'Model:parameters',
		]);
		expect(step.group.rootSection).toBeUndefined();
	});

	it('preserves execution order between two non-overlapping groups', () => {
		const sections = [
			makeWorkflowSetupSection({ id: 'ModelA:openAiApi', targetNodeName: 'Model A' }),
			makeWorkflowSetupSection({ id: 'ModelB:openAiApi', targetNodeName: 'Model B' }),
		];
		const requests = [
			makeSetupRequest({ node: { name: 'Model A' }, subnodeRootNode: agent }),
			makeSetupRequest({ node: { name: 'Model B' }, subnodeRootNode: agentB }),
		];

		const { steps } = harness(sections, requests);

		expect(steps.value).toHaveLength(2);
		const [first, second] = steps.value;
		if (first.kind !== 'group' || second.kind !== 'group') throw new Error('expected groups');
		expect(first.group.subnodeRootNode.name).toBe('Agent');
		expect(second.group.subnodeRootNode.name).toBe('Agent B');
	});
});
