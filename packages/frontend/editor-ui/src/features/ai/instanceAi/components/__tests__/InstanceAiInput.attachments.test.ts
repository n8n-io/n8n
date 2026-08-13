import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiInput from '../InstanceAiInput.vue';
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
	isPlanEditMode: false,
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

		// The composer's watcher drains the store's staging area into its own draft ref.
		await waitFor(() => expect(store.pendingComposerAttachments).toHaveLength(0));

		expect(textbox).toHaveValue('my question');
	});
});
