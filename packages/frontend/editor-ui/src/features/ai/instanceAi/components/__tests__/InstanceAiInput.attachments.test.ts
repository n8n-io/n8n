import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiInput from '../InstanceAiInput.vue';
import AttachmentPreview from '../AttachmentPreview.vue';
import { useInstanceAiStore } from '../../instanceAi.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { AssistantMentionSelection } from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

const telemetryTrack = vi.hoisted(() => vi.fn());

// The plus menu asks for a router; keep the rest of vue-router real.
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: telemetryTrack })),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn(() => ({ addEventListener: vi.fn(() => () => {}) })),
}));

const defaultProps = () => ({
	isStreaming: false,
	isSubmitting: false,
	isAwaitingConfirmation: false,
	isAwaitingPlanReview: false,
	currentThreadId: 'thread-1',
	amendContext: null,
	contextualSuggestion: null,
	isWorkflowBuilderAvailable: true,
	contextChip: null,
});

const renderComponent = createComponentRenderer(InstanceAiInput, {
	props: defaultProps(),
});

describe('InstanceAiInput — staged node attachments', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		telemetryTrack.mockClear();
	});

	it('keeps the existing input menu enabled outside the mentions rollout', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-input-menu')).toBeEnabled();
	});

	it('consumes staged attachments into the draft without touching already-typed text', async () => {
		const { getByRole } = renderComponent();
		const store = useInstanceAiStore();

		const textbox = getByRole('textbox');
		await userEvent.type(textbox, 'my question');

		store.stageNodeSets('w1', [{ nodes: [{ id: 'n1', name: 'A' }] }]);

		await waitFor(() => expect(store.pendingComposerAttachments).toHaveLength(0));

		expect(textbox).toHaveValue('my question');
	});

	it('dedups re-staging the same selection instead of stacking duplicate chips', async () => {
		const { findAllByTestId, queryAllByTestId } = renderComponent();
		const store = useInstanceAiStore();

		store.stageNodeSets('w1', [{ nodes: [{ id: 'n1', name: 'A' }] }]);
		await findAllByTestId('nodes-chip-node');

		store.stageNodeSets('w1', [{ nodes: [{ id: 'n1', name: 'A' }] }]);
		await waitFor(() => expect(store.pendingComposerAttachments).toHaveLength(0));
		expect(queryAllByTestId('nodes-chip-node')).toHaveLength(1);

		store.stageNodeSets('w1', [{ nodes: [{ id: 'n2', name: 'B' }] }]);
		await waitFor(() => expect(queryAllByTestId('nodes-chip-node')).toHaveLength(2));
	});

	it('enables send with staged chips and empty text, and restores chips on failed send', async () => {
		const { emitted, findAllByTestId, findByTestId, queryAllByTestId } = renderComponent();
		const store = useInstanceAiStore();

		store.stageNodeSets('w1', [{ nodes: [{ id: 'n1', name: 'A' }] }]);
		await findAllByTestId('nodes-chip-node');

		const sendButton = await findByTestId('instance-ai-send-button');
		expect(sendButton).toBeEnabled();
		await userEvent.click(sendButton);

		await waitFor(() => expect(emitted().submit?.[0]).toBeDefined());
		const [message, attachments, restoreDraft] = emitted().submit[0] as [
			string,
			unknown[],
			() => boolean,
		];
		expect(message).toBe('');
		expect(attachments).toEqual([expect.objectContaining({ type: 'nodes', workflowId: 'w1' })]);
		expect(queryAllByTestId('nodes-chip-node')).toHaveLength(0);

		expect(restoreDraft()).toBe(true);
		await findAllByTestId('nodes-chip-node');
	});

	// Plan feedback is resumed as a plain string, so attachments cannot ride along.
	// They must stay staged for the next real message rather than vanish on send.
	it('keeps staged chips out of plan feedback instead of dropping them', async () => {
		const { emitted, findAllByTestId, findByTestId, getByRole, rerender } = renderComponent();
		const store = useInstanceAiStore();

		store.stageNodeSets('w1', [{ nodes: [{ id: 'n1', name: 'A' }] }]);
		await findAllByTestId('nodes-chip-node');

		await rerender({ ...defaultProps(), isAwaitingPlanReview: true, isStreaming: true });
		await userEvent.type(getByRole('textbox'), 'Drop the third workflow');
		await userEvent.click(await findByTestId('instance-ai-send-button'));

		await waitFor(() => expect(emitted().submit?.[0]).toBeDefined());
		const [message, attachments] = emitted().submit[0] as [string, unknown];
		expect(message).toBe('Drop the third workflow');
		expect(attachments).toBeUndefined();

		// Still staged, so the user can see them and send them deliberately later.
		await findAllByTestId('nodes-chip-node');
	});
	// Attachments are never submitted with plan feedback, so `isDirty()` stays true
	// from the staged chips alone — the text restore must not depend on it.
	it('restores plan feedback text on a failed send even with chips still staged', async () => {
		const { emitted, findAllByTestId, findByTestId, getByRole, rerender } = renderComponent();
		const store = useInstanceAiStore();

		store.stageNodeSets('w1', [{ nodes: [{ id: 'n1', name: 'A' }] }]);
		await findAllByTestId('nodes-chip-node');

		await rerender({ ...defaultProps(), isAwaitingPlanReview: true, isStreaming: true });
		const textbox = getByRole('textbox');
		await userEvent.type(textbox, 'Drop the third workflow');
		await userEvent.click(await findByTestId('instance-ai-send-button'));

		await waitFor(() => expect(emitted().submit?.[0]).toBeDefined());
		const [, , restoreDraft] = emitted().submit[0] as [string, unknown, () => boolean];

		expect(restoreDraft).toBeTypeOf('function');
		expect(restoreDraft()).toBe(true);
		await waitFor(() => expect(textbox).toHaveValue('Drop the third workflow'));
	});
});

const renderAttachmentPreview = createComponentRenderer(AttachmentPreview);

describe('AttachmentPreview — nodes attachment delegation', () => {
	it('delegates a nodes attachment to NodesAttachmentChips instead of the workflow/file branches', () => {
		const { queryByTestId, getByTestId, container } = renderAttachmentPreview({
			props: {
				attachment: {
					type: 'nodes',
					workflowId: 'w1',
					sets: [{ nodes: [{ id: 'n1', name: 'A' }] }],
				},
			},
		});

		expect(queryByTestId('attachment-preview-resource')).not.toBeInTheDocument();
		expect(container.querySelector('[class*="chatFile"]')).not.toBeInTheDocument();
		expect(getByTestId('nodes-chip-node')).toBeInTheDocument();
	});

	it('lets a removable workflow chip emit resource removal', async () => {
		const { getByTestId, emitted } = renderAttachmentPreview({
			props: {
				attachment: { type: 'workflow', id: 'w1', name: 'Orders' },
				isRemovable: true,
			},
		});

		await userEvent.click(getByTestId('attachment-preview-remove-resource'));
		expect(emitted()['remove-resource']).toHaveLength(1);
	});
});

const workflowMentionSelection: AssistantMentionSelection = {
	item: {
		key: 'workflow:w1:w1',
		kind: 'workflow',
		source: 'workflows',
		label: 'Orders',
		breadcrumbs: ['Orders'],
		workflowId: 'w1',
		entityId: 'w1',
		workflowName: 'Orders',
	},
	attachment: { type: 'workflow', id: 'w1', name: 'Orders' },
	truncated: false,
	telemetry: { mode: 'browse', resultPosition: 1, queryLength: 0 },
};

const nodeMentionSelection: AssistantMentionSelection = {
	item: {
		key: 'node:w1:n1',
		kind: 'node',
		source: 'artifacts',
		label: 'Validate',
		breadcrumbs: ['Orders', 'Validate'],
		workflowId: 'w1',
		entityId: 'n1',
		workflowName: 'Orders',
	},
	attachment: {
		type: 'nodes',
		workflowId: 'w1',
		workflowName: 'Orders',
		sets: [{ nodes: [{ id: 'n1', name: 'Validate' }] }],
	},
	truncated: false,
	telemetry: { mode: 'search', resultPosition: 2, queryLength: 3 },
};

const MentionPickerStub = defineComponent({
	name: 'AssistantAtMentionPicker',
	props: {
		modelValue: { type: Boolean, default: false },
		query: { type: String, default: '' },
	},
	emits: ['select'],
	setup(props, { emit }) {
		return () =>
			h('div', { 'data-test-id': 'mention-picker-stub', 'data-query': props.query }, [
				h(
					'button',
					{
						'data-test-id': 'mention-picker-select',
						onClick: () => emit('select', workflowMentionSelection),
					},
					'Select workflow',
				),
				h(
					'button',
					{
						'data-test-id': 'mention-picker-select-node',
						onClick: () => emit('select', nodeMentionSelection),
					},
					'Select node',
				),
			]);
	},
});

const renderMentionsInput = createComponentRenderer(InstanceAiInput, {
	props: {
		...defaultProps(),
		mentionsEnabled: true,
		mentionProjectId: 'project-1',
		mentionArtifacts: [{ id: 'w1', name: 'Orders' }],
	},
	global: { stubs: { AssistantAtMentionPicker: MentionPickerStub } },
});

describe('InstanceAiInput — mention attachments', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		telemetryTrack.mockClear();
	});

	it('tracks a typed picker open without sending draft text', async () => {
		const { getByRole } = renderMentionsInput();

		await userEvent.type(getByRole('textbox'), '@');

		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_OPENED_AI_ASSISTANT_MENTION_PICKER,
			{ source: 'typed' },
		);
	});

	it('re-parses a typed mention after project availability resolves', async () => {
		let resolveWorkflows!: (workflows: Array<{ id: string }>) => void;
		const workflows = new Promise<Array<{ id: string }>>((resolve) => {
			resolveWorkflows = resolve;
		});
		vi.spyOn(useWorkflowsListStore(), 'searchWorkflows').mockReturnValue(workflows as never);
		const { getByRole, getByTestId } = renderMentionsInput({
			props: { mentionArtifacts: [] },
		});

		await userEvent.type(getByRole('textbox'), '@ord');
		expect(telemetryTrack).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_OPENED_AI_ASSISTANT_MENTION_PICKER,
			expect.anything(),
		);

		resolveWorkflows([{ id: 'w2' }]);

		await waitFor(() =>
			expect(getByTestId('mention-picker-stub')).toHaveAttribute('data-query', 'ord'),
		);
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_OPENED_AI_ASSISTANT_MENTION_PICKER,
			{ source: 'typed' },
		);
	});

	it('inserts quoted text, attaches the workflow, and registers a transient reference', async () => {
		const { getByRole, getByTestId, emitted } = renderMentionsInput();
		const textbox = getByRole('textbox');
		await userEvent.type(textbox, 'Compare ');
		await userEvent.click(getByTestId('mention-picker-select'));

		expect(textbox).toHaveValue('Compare "Orders"');
		expect(getByTestId('attachment-preview-resource')).toHaveTextContent('Orders');
		expect(emitted()['mention-reference-added']).toHaveLength(1);
		expect(emitted()['mention-workflow-open']?.[0]).toEqual(['w1']);
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_SELECTED_AI_ASSISTANT_MENTION,
			{
				kind: 'workflow',
				mode: 'browse',
				source: 'workflows',
				result_position: 1,
				query_length: 0,
				already_artifact: true,
			},
		);
	});

	it('does not track a duplicate selection as newly staged context', async () => {
		const { getByTestId } = renderMentionsInput();

		await userEvent.click(getByTestId('mention-picker-select'));
		await userEvent.click(getByTestId('mention-picker-select'));

		expect(
			telemetryTrack.mock.calls.filter(
				([event]) => event === TELEMETRY_EVENT.INSTANCE_AI.USER_SELECTED_AI_ASSISTANT_MENTION,
			),
		).toHaveLength(1);
	});

	it('keeps mention context on failed send and releases it after an accepted send', async () => {
		const { getByTestId, findByTestId, emitted } = renderMentionsInput();
		await userEvent.click(getByTestId('mention-picker-select'));
		await userEvent.click(await findByTestId('instance-ai-send-button'));

		const firstSubmit = emitted().submit?.[0] as [
			string,
			unknown[],
			() => boolean,
			unknown,
			number,
			() => void,
			unknown,
		];
		expect(firstSubmit[1]).toEqual([{ type: 'workflow', id: 'w1', name: 'Orders' }]);
		expect(firstSubmit[6]).toEqual({
			mentionCount: 1,
			workflowMentionCount: 1,
			nodeMentionCount: 0,
			groupMentionCount: 0,
		});
		expect(firstSubmit[2]()).toBe(true);
		await findByTestId('attachment-preview-resource');
		expect(emitted()['mention-reference-removed']).toBeUndefined();

		await userEvent.click(await findByTestId('instance-ai-send-button'));
		const secondSubmit = emitted().submit?.[1] as [
			string,
			unknown[],
			() => boolean,
			unknown,
			number,
			() => void,
		];
		secondSubmit[5]();
		expect(emitted()['mention-reference-removed']).toHaveLength(1);
		expect(telemetryTrack).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_REMOVED_AI_ASSISTANT_MENTION,
			{ kind: 'workflow' },
		);
	});

	it('adds node context with parent workflow metadata', async () => {
		const { getByTestId, getByRole, emitted } = renderMentionsInput({
			props: { mentionArtifacts: [{ id: 'artifact', name: 'Other workflow' }] },
		});
		await userEvent.click(getByTestId('mention-picker-select-node'));

		expect(getByRole('textbox')).toHaveValue('"Validate"');
		await userEvent.click(getByTestId('instance-ai-send-button'));
		const submit = emitted().submit?.[0] as [string, unknown[]];
		expect(submit[1]).toEqual([
			{
				type: 'nodes',
				workflowId: 'w1',
				workflowName: 'Orders',
				sets: [{ nodes: [{ id: 'n1', name: 'Validate' }] }],
			},
		]);
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_SELECTED_AI_ASSISTANT_MENTION,
			{
				kind: 'node',
				mode: 'search',
				source: 'artifacts',
				result_position: 2,
				query_length: 3,
				already_artifact: false,
			},
		);
	});

	it('removes the transient reference with the workflow chip', async () => {
		const { getByTestId, emitted } = renderMentionsInput();
		await userEvent.click(getByTestId('mention-picker-select'));
		await userEvent.click(getByTestId('attachment-preview-remove-resource'));

		expect(emitted()['mention-reference-removed']).toHaveLength(1);
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_REMOVED_AI_ASSISTANT_MENTION,
			{ kind: 'workflow' },
		);
	});
});
