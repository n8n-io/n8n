import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';

import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';

import type { SetupSavedSection } from '../../workflowSetup/workflowSetupSavedTelemetry';
import { useAssistantAgentSetupSavedTelemetry } from '../useAssistantAgentSetupSavedTelemetry';

const { telemetryTrack } = vi.hoisted(() => ({ telemetryTrack: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

vi.mock('@/experiments/instanceAiSetupPanel/useInstanceAiSetupPanelExperiment', () => ({
	useInstanceAiSetupPanelExperiment: () => ({ getTelemetryPayload: () => ({}) }),
}));

const EVENT = TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED;

const slackNode = { id: 'node-1', name: 'Slack', type: 'n8n-nodes-base.slack' };
const sections: SetupSavedSection[] = [
	{
		credentialType: 'slackApi',
		credentialTargetNodes: [slackNode],
		parameterNames: [],
		node: slackNode,
	},
];

const appliedResult = {
	success: true,
	completedNodes: [{ nodeName: 'Slack', credentialType: 'slackApi' }],
};

function setupToolCall(requestId: string): ToolCall {
	return {
		tool: 'setup_workflow',
		toolCallId: `call-${requestId}`,
		state: 'suspended',
		suspendPayload: { requestId, message: 'Set up', severity: 'info', setupRequests: [] },
	} as ToolCall;
}

function setup() {
	const toolCall = ref(setupToolCall('req-1'));
	const messages = ref<ChatMessage[]>([
		{ id: 'msg-1', role: 'assistant', content: '', toolCalls: [toolCall.value] } as ChatMessage,
	]);
	const telemetry = useAssistantAgentSetupSavedTelemetry({
		threadId: 'thread-1',
		messages: () => messages.value,
	});
	// The reactive tool call inside the messages, so updates reach the watcher.
	const call = () => messages.value[0].toolCalls![0];
	return { telemetry, call };
}

describe('useAssistantAgentSetupSavedTelemetry', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		useRootStore().setInstanceId('instance-1');
		telemetryTrack.mockReset();
	});

	it('sends the event once the setup tool result arrives, with the properties of the current runtime', async () => {
		const { telemetry, call } = setup();
		telemetry.expectResult({ requestId: 'req-1', workflowId: 'wf-1', sections });

		// The chat shows the resume body first. It is not the tool result.
		call().state = 'done';
		call().output = { kind: 'setupWorkflowApply', nodeCredentials: {} };
		await nextTick();
		expect(telemetryTrack).not.toHaveBeenCalled();

		call().output = appliedResult;
		await nextTick();

		expect(telemetryTrack).toHaveBeenCalledTimes(1);
		expect(telemetryTrack).toHaveBeenCalledWith(EVENT, {
			instance_id: 'instance-1',
			workflow_id: 'wf-1',
			thread_id: 'thread-1',
			session_id: expect.any(String),
			source: 'instance_ai_setup_wizard',
			request_id: 'req-1',
			items: [
				{
					node_id: 'node-1',
					node_type: 'n8n-nodes-base.slack',
					kind: 'credential',
					credential_type: 'slackApi',
					completed: true,
				},
			],
			setup_complete: true,
			runtime: 'agents',
		});

		// A later chat update does not send the event again.
		call().displaySummary = 'Applied';
		await nextTick();
		expect(telemetryTrack).toHaveBeenCalledTimes(1);
	});

	it('sends no event for a setup tool call that the user did not answer in this view', async () => {
		const { telemetry, call } = setup();
		// A different apply waits, so the watcher scans the chat and compares the request IDs.
		telemetry.expectResult({ requestId: 'req-2', workflowId: 'wf-1', sections });

		call().state = 'done';
		call().output = appliedResult;
		await nextTick();

		expect(telemetryTrack).not.toHaveBeenCalled();
	});

	it('sends no event for a failed apply', async () => {
		const { telemetry, call } = setup();
		telemetry.expectResult({ requestId: 'req-1', workflowId: 'wf-1', sections });

		call().state = 'done';
		call().output = { success: false, error: 'Apply failed.' };
		await nextTick();

		expect(telemetryTrack).not.toHaveBeenCalled();
	});
});
