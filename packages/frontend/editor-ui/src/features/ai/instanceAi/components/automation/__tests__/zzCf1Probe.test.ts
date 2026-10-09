import { defineComponent, h, type PropType } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { useRootStore } from '@n8n/stores/useRootStore';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';
import { agentsChatToThreadMessages } from '../../../agentsChatThreadAdapter';
import { provideThread } from '../../../instanceAi.store';
import { createThreadRuntime, type ThreadRuntime } from '../../../instanceAi.threadRuntime';
import { createTestRouter } from '../../../navigation/__tests__/navigationFixtures';
import AutomationProposalCard from '../AutomationProposalCard.vue';
import { makeProposal } from './automationProposalFixtures';

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: { props: ['nodeType', 'nodeName', 'size'], template: '<span />' },
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: () => null,
		loadNodeTypesIfNotLoaded: async () => {},
	}),
}));

// Some models count their tool call ids from 1 in each response, so the build of the workflow
// and the proposal for it can have the same id in one chat.
const REUSED_ID = 'toolu_1';
const TURN_ON = {
	kind: 'capabilityDecision',
	approved: true,
	values: { target: 'local', activate: true },
};
const KEPT = { workflowId: 'wf-1', url: 'http://localhost:5678/workflow/wf-1', kept: true };

function toolCall(fields: Partial<ToolCall> & Pick<ToolCall, 'tool'>): ToolCall {
	return {
		toolCallId: REUSED_ID,
		input: { workflowId: 'wf-1' },
		state: TOOL_CALL_STATE.DONE,
		...fields,
	};
}

function assistantMessage(id: string, toolCalls: ToolCall[]): ChatMessage {
	return { id, role: 'assistant', content: '', status: 'success', toolCalls };
}

const BUILD = toolCall({ tool: 'build-workflow', output: { workflowId: 'wf-1', saved: true } });

/** The thread mirror of the Assistant chat, filled from the chat messages as the chat fills it. */
function runtimeWith(messages: ChatMessage[]): ThreadRuntime {
	const runtime = createThreadRuntime('thread-1', { getThreadMetadata: () => undefined });
	runtime.syncAgentsChat(agentsChatToThreadMessages(messages, false), false);
	return runtime;
}

const InChat = defineComponent({
	props: { runtime: { type: Object as PropType<ThreadRuntime>, required: true } },
	setup(props) {
		provideThread(props.runtime);
		return () =>
			h(AutomationProposalCard, {
				proposal: makeProposal(),
				resolvedValue: TURN_ON,
				toolCallId: REUSED_ID,
			});
	},
});

const renderInChat = createComponentRenderer(InChat);

let pinia: TestingPinia;

function statusAfterTurnOn(messages: ChatMessage[]) {
	const { getByTestId } = renderInChat({
		pinia,
		props: { runtime: runtimeWith(messages) },
		global: { plugins: [createTestRouter()] },
	});
	return getByTestId('automation-proposal-resolved-status');
}

beforeEach(() => {
	pinia = createTestingPinia();
	setActivePinia(pinia);
	mockedStore(useRootStore).instanceId = 'instance-1';
	mockedStore(useWorkflowsListStore).getWorkflowById.mockReturnValue(
		undefined as unknown as ReturnType<ReturnType<typeof useWorkflowsListStore>['getWorkflowById']>,
	);
});

describe('probe', () => {
	it('second propose card with a repeated id reads its own result', () => {
		const status = statusAfterTurnOn([
			assistantMessage('p1', [
				toolCall({ tool: 'propose_automation', output: { ...KEPT, active: false } }),
			]),
			assistantMessage('p2', [
				toolCall({ tool: 'propose_automation', output: { ...KEPT, active: true } }),
			]),
		]);
		expect(status).toHaveAttribute('data-status', 'on');
	});
});
