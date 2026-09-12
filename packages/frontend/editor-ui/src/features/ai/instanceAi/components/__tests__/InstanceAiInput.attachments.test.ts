import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiInput from '../InstanceAiInput.vue';
import AttachmentPreview from '../AttachmentPreview.vue';
import { useInstanceAiStore } from '../../instanceAi.store';

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: vi.fn() })),
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
});
