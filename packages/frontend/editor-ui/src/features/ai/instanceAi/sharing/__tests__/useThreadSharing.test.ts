import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, inject, type PropType } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { AGENT_CHAT_TOOL_STEP_NOTE } from '@/features/agents/utils/tool-step-note';
import type { AgentResumeFailure } from '@/features/agents/utils/chat-rejection';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';
import { useInstanceAiStore } from '../../instanceAi.store';
import { useOptionalThreadSharing } from '../threadSharingContext';
import { provideThreadSharing } from '../useThreadSharing';
import {
	OWNER,
	PROJECT_ID,
	READ_SCOPES,
	TEAMMATE,
	THREAD_ID,
	setUpSharing,
	sharedThreadSummary,
} from './sharingFixtures';

const { showMessage } = vi.hoisted(() => ({ showMessage: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage }) }));

const approved = (by: { id: string; name: string }): ToolCall => ({
	tool: 'executions',
	toolCallId: 'tc-1',
	state: 'done',
	approvedBy: by,
});
const declined = (by: { id: string; name: string }): ToolCall => ({
	tool: 'workflows',
	toolCallId: 'tc-2',
	state: 'done',
	declinedBy: by,
});

/** Renders what a card and a tool-step row deep in the conversation read. */
const Probe = defineComponent({
	props: { toolCalls: { type: Array as PropType<ToolCall[]>, required: true } },
	setup(props) {
		const note = inject(AGENT_CHAT_TOOL_STEP_NOTE, undefined);
		const sharing = useOptionalThreadSharing();
		return () =>
			h('div', [
				h('span', { 'data-test-id': 'role' }, sharing?.view.value.role),
				h(
					'span',
					{ 'data-test-id': 'access' },
					String(
						sharing?.cardAccess({
							toolName: 'executions',
							input: { action: 'run', workflowId: 'wf-1' },
							suspendPayload: { requestId: 'r', message: 'Run?', severity: 'info' },
						}),
					),
				),
				...props.toolCalls.map((toolCall) =>
					h('span', { 'data-test-id': `note-${toolCall.toolCallId}` }, note?.(toolCall) ?? ''),
				),
			]);
	},
});

function renderConversation(toolCalls: ToolCall[]) {
	let onResumeFailed: (failure: AgentResumeFailure) => void = () => {};
	const Host = defineComponent({
		setup() {
			const transcript: ChatMessage[] = [{ id: 'm-1', role: 'assistant', content: '', toolCalls }];
			const sharing = provideThreadSharing({ id: THREAD_ID, projectId: PROJECT_ID }, () => transcript);
			onResumeFailed = sharing.onResumeFailed;
			return () => h(Probe, { toolCalls });
		},
	});
	return { ...createComponentRenderer(Host)(), onResumeFailed };
}

describe('provideThreadSharing', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('gives the owner every card and no names on the owner’s own answers in a private chat', () => {
		setUpSharing();
		const { getByTestId } = renderConversation([approved(OWNER)]);

		expect(getByTestId('role')).toHaveTextContent('owner');
		expect(getByTestId('access')).toHaveTextContent('undefined');
		expect(getByTestId('note-tc-1')).toHaveTextContent(/^$/);
	});

	it('names every answer in a shared chat, and the viewer as "you"', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id });
		const { getByTestId } = renderConversation([approved(OWNER), declined(TEAMMATE)]);

		expect(getByTestId('role')).toHaveTextContent('teammate');
		expect(getByTestId('note-tc-1')).toHaveTextContent('Approved by Alice Owner');
		expect(getByTestId('note-tc-2')).toHaveTextContent('Declined by you');
	});

	it('names nobody on a card that a message from the owner cancelled', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id });
		// The server records the cancellation like an approval by the owner.
		const cancelled: ToolCall = { ...approved(OWNER), state: 'cancelled', canceled: true };
		const { getByTestId } = renderConversation([cancelled]);

		expect(getByTestId('note-tc-1')).toHaveTextContent(/^$/);
	});

	it('says "Answered by" for the answers to a card that asks questions', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id });
		const answeredQuestions: ToolCall = {
			...approved(OWNER),
			suspendPayload: { requestId: 'r', message: '', inputType: 'questions', questions: [] },
		};
		const { getByTestId } = renderConversation([answeredQuestions]);

		expect(getByTestId('note-tc-1')).toHaveTextContent('Answered by Alice Owner');
	});

	it('shows a refused answer in a toast that is not tracked, as its text can name people', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id });
		const { onResumeFailed } = renderConversation([]);

		onResumeFailed({
			toolCallId: 'tc-1',
			status: 403,
			message: 'Only editors in Marketing can approve this.',
		});

		expect(showMessage).toHaveBeenCalledWith(
			{
				type: 'error',
				title: "Couldn't send your answer",
				message: 'Only editors in Marketing can approve this.',
			},
			false,
		);
	});

	it('says who answered first after a 409, from the history', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id });
		const { onResumeFailed } = renderConversation([approved(OWNER)]);

		onResumeFailed({ toolCallId: 'tc-1', status: 409, answeredBy: 'Alice Owner' });

		expect(showMessage).toHaveBeenCalledWith({
			type: 'info',
			title: 'Already answered by Alice Owner.',
		});
	});

	it('checks a teammate’s role in the chat project for each card', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id, scopes: READ_SCOPES });
		const { getByTestId } = renderConversation([]);

		expect(getByTestId('access')).toHaveTextContent('needs-role');
	});

	it('reads a chat that only the history page holds', () => {
		setUpSharing({ viewerId: TEAMMATE.id });
		const store = useInstanceAiStore();
		store.threads = [];
		store.threadHistory.threads = [sharedThreadSummary({ shared: true })];
		const { getByTestId } = renderConversation([approved(OWNER)]);

		expect(getByTestId('role')).toHaveTextContent('teammate');
		expect(getByTestId('note-tc-1')).toHaveTextContent('Approved by Alice Owner');
	});
});
