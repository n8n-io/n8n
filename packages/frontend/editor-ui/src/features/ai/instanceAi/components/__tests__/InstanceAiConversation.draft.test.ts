import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, type PropType } from 'vue';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { AssistantMentionSelection } from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';
import {
	createThreadComponentRenderer,
	defaultModuleSettings,
	makeThread,
} from '../../__tests__/createThreadComponentRenderer';
import InstanceAiConversation from '../InstanceAiConversation.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../../instanceAi.store';

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: {}, query: {} }),
}));

type PendingConfirmation = ThreadRuntime['pendingConfirmations'][number];

const workflowMention: AssistantMentionSelection = {
	item: {
		key: 'workflow:wf-1:wf-1',
		kind: 'workflow',
		source: 'artifacts',
		label: 'Orders',
		breadcrumbs: ['Orders'],
		workflowId: 'wf-1',
		entityId: 'wf-1',
		workflowName: 'Orders',
	},
	attachment: { type: 'workflow', id: 'wf-1', name: 'Orders' },
	truncated: false,
	telemetry: { mode: 'browse', resultPosition: 1, queryLength: 0 },
};

const MentionPickerStub = defineComponent({
	name: 'AssistantAtMentionPicker',
	emits: ['select'],
	setup(_props, { emit }) {
		return () =>
			h('button', {
				'data-test-id': 'mention-picker-select',
				onClick: () => emit('select', workflowMention),
			});
	},
});

const ConfirmationPanelStub = defineComponent({
	name: 'InstanceAiConfirmationPanel',
	props: { kind: { type: String as PropType<'inline' | 'floating'>, required: true } },
	setup(props) {
		return () =>
			props.kind === 'floating' ? h('button', { 'data-test-id': 'floating-confirmation' }) : null;
	},
});

function makeConfirmation(requestId: string, inputType?: 'questions'): PendingConfirmation {
	return {
		messageId: `msg-${requestId}`,
		agentNode: { agentId: 'agent-1', role: 'orchestrator' },
		toolCall: {
			toolCallId: `tc-${requestId}`,
			toolName: 'workflow_builder_workflows',
			args: {},
			isLoading: true,
			confirmationStatus: 'pending',
			confirmation: { requestId, severity: 'info', message: 'Continue?', inputType },
		},
	} as unknown as PendingConfirmation;
}

const stubs = {
	AssistantAtMentionPicker: MentionPickerStub,
	InstanceAiConfirmationPanel: ConfirmationPanelStub,
};

describe('InstanceAiConversation — unsent draft during floating confirmations', () => {
	let thread: ThreadRuntime;

	const renderConversation = createThreadComponentRenderer(
		InstanceAiConversation,
		{ props: { mentionsEnabled: true }, global: { stubs } },
		() => thread,
	);

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		useSettingsStore().moduleSettings = { 'instance-ai': { ...defaultModuleSettings } };
		thread = makeThread();
		// Mentions are available only when the thread has a workflow to mention.
		thread.producedArtifacts.set('wf-1', { type: 'workflow', id: 'wf-1', name: 'Orders' });
		mockedStore(useInstanceAiStore).getRuntime.mockImplementation(() => thread);
	});

	async function renderWithDraft() {
		const view = renderConversation();
		const textbox = view.getByRole<HTMLTextAreaElement>('textbox');
		await userEvent.click(view.getByTestId('mention-picker-select'));
		// Set the draft text explicitly. Mention selection can leave the text unchanged.
		await userEvent.clear(textbox);
		await userEvent.type(textbox, 'Testing123 "Orders"');
		await fireEvent.paste(textbox, {
			clipboardData: { files: [new File(['a,b'], 'orders.csv', { type: 'text/csv' })] },
		});
		expectDraft(view, 'Testing123 "Orders"');
		return { view, draftText: textbox.value };
	}

	async function setPendingConfirmations(confirmations: PendingConfirmation[]) {
		thread.pendingConfirmations = confirmations;
		await nextTick();
	}

	function expectDraft(view: ReturnType<typeof renderConversation>, draftText: string) {
		expect(view.getByRole('textbox')).toHaveValue(draftText);
		expect(view.getByTestId('attachment-preview-resource')).toHaveTextContent('Orders');
		expect(view.getByTitle('orders.csv')).toBeInTheDocument();
	}

	it('keeps the same composer and its draft through a floating approval', async () => {
		const { view, draftText } = await renderWithDraft();
		const composer = view.getByTestId('instance-ai-composer');

		await setPendingConfirmations([makeConfirmation('req-1')]);
		expect(composer).not.toBeVisible();

		await setPendingConfirmations([]);
		expect(view.getByTestId('instance-ai-composer')).toBe(composer);
		expect(composer).toBeVisible();
		expectDraft(view, draftText);
	});

	it('keeps the composer hidden until the last floating approval or question ends', async () => {
		const { view, draftText } = await renderWithDraft();
		const approval = makeConfirmation('req-1');
		const question = makeConfirmation('req-q', 'questions');

		await setPendingConfirmations([approval, question]);
		await setPendingConfirmations([question]);
		expect(view.getByTestId('instance-ai-composer')).not.toBeVisible();

		await setPendingConfirmations([]);
		expectDraft(view, draftText);
	});

	it('returns focus to the composer while the confirmation fades out', async () => {
		// A real Transition keeps the leaving panel, and its focus, in the DOM.
		const view = renderConversation({ global: { stubs: { ...stubs, transition: false } } });

		await setPendingConfirmations([makeConfirmation('req-1')]);
		view.getByTestId('floating-confirmation').focus();
		await setPendingConfirmations([]);

		expect(view.getByRole('textbox')).toHaveFocus();
	});

	it('starts another thread with an empty composer', async () => {
		const { view: firstView } = await renderWithDraft();
		await setPendingConfirmations([makeConfirmation('req-1')]);
		firstView.unmount();

		thread = makeThread();
		thread.id = 'thread-2';
		const secondView = renderConversation();

		expect(secondView.getByRole('textbox')).toHaveValue('');
		expect(secondView.queryByTestId('attachment-preview-resource')).not.toBeInTheDocument();
		expect(secondView.queryByTitle('orders.csv')).not.toBeInTheDocument();
	});
});
