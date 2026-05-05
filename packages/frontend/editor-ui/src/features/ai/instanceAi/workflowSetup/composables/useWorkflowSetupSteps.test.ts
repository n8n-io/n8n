import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { makeSetupRequest, makeWorkflowSetupSection } from '../__tests__/factories';
import { isWorkflowSetupGroupStep, type WorkflowSetupSection } from '../workflowSetup.types';
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
		expect(steps.value.every((s) => !!s.section)).toBe(true);
	});

	it('inserts the group at the first sub-node position when the parent comes after the sub-nodes', () => {
		const sections = [
			makeWorkflowSetupSection({ id: 'Model:openAiApi', targetNodeName: 'Model' }),
			makeWorkflowSetupSection({ id: 'Standalone:slackApi', targetNodeName: 'Standalone' }),
			makeWorkflowSetupSection({ id: 'Agent:foo', targetNodeName: 'Agent' }),
		];
		const requests = [
			makeSetupRequest({ node: { name: 'Model' }, parentNode: agent }),
			makeSetupRequest({ node: { name: 'Standalone' } }),
			makeSetupRequest({ node: { name: 'Agent' } }),
		];

		const { steps } = harness(sections, requests);

		expect(steps.value).toHaveLength(2);
		expect(isWorkflowSetupGroupStep(steps.value[0])).toBe(true);
		const groupStep = steps.value[0];
		if (!groupStep.group) throw new Error('expected group step');
		expect(groupStep.group.parentNode.name).toBe('Agent');
		expect(groupStep.group.subnodeSections.map((s) => s.id)).toEqual(['Model:openAiApi']);
		expect(groupStep.group.parentSection?.id).toBe('Agent:foo');
		expect(steps.value[1].section?.targetNodeName).toBe('Standalone');
	});

	it('inserts the group at the parent position when the parent comes before its sub-nodes', () => {
		const sections = [
			makeWorkflowSetupSection({ id: 'Agent:foo', targetNodeName: 'Agent' }),
			makeWorkflowSetupSection({ id: 'Standalone:slackApi', targetNodeName: 'Standalone' }),
			makeWorkflowSetupSection({ id: 'Model:openAiApi', targetNodeName: 'Model' }),
		];
		const requests = [
			makeSetupRequest({ node: { name: 'Agent' } }),
			makeSetupRequest({ node: { name: 'Standalone' } }),
			makeSetupRequest({ node: { name: 'Model' }, parentNode: agent }),
		];

		const { steps } = harness(sections, requests);

		expect(steps.value).toHaveLength(2);
		expect(isWorkflowSetupGroupStep(steps.value[0])).toBe(true);
		expect(steps.value[1].section?.targetNodeName).toBe('Standalone');
	});

	it('emits a group with no parentSection when the parent has no setup request', () => {
		const sections = [makeWorkflowSetupSection({ id: 'Model:openAiApi', targetNodeName: 'Model' })];
		const requests = [makeSetupRequest({ node: { name: 'Model' }, parentNode: agent })];

		const { steps } = harness(sections, requests);

		expect(steps.value).toHaveLength(1);
		const step = steps.value[0];
		if (!step.group) throw new Error('expected group');
		expect(step.group.parentSection).toBeUndefined();
		expect(step.group.subnodeSections.map((s) => s.id)).toEqual(['Model:openAiApi']);
		expect(step.group.parentNode).toEqual(agent);
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
			makeSetupRequest({ node: { name: 'Model' }, parentNode: agent }),
			makeSetupRequest({
				node: { name: 'Model' },
				parentNode: agent,
				credentialType: undefined,
				editableParameters: [{ name: 'temperature', displayName: 'Temperature', type: 'number' }],
			}),
		];

		const { steps } = harness(sections, requests);

		expect(steps.value).toHaveLength(1);
		const step = steps.value[0];
		if (!step.group) throw new Error('expected group');
		expect(step.group.subnodeSections.map((s) => s.id)).toEqual([
			'Model:openAiApi',
			'Model:parameters',
		]);
		expect(step.group.parentSection).toBeUndefined();
	});

	it('preserves execution order between two non-overlapping groups', () => {
		const sections = [
			makeWorkflowSetupSection({ id: 'ModelA:openAiApi', targetNodeName: 'Model A' }),
			makeWorkflowSetupSection({ id: 'ModelB:openAiApi', targetNodeName: 'Model B' }),
		];
		const requests = [
			makeSetupRequest({ node: { name: 'Model A' }, parentNode: agent }),
			makeSetupRequest({ node: { name: 'Model B' }, parentNode: agentB }),
		];

		const { steps } = harness(sections, requests);

		expect(steps.value).toHaveLength(2);
		expect(steps.value[0].group?.parentNode.name).toBe('Agent');
		expect(steps.value[1].group?.parentNode.name).toBe('Agent B');
	});
});
