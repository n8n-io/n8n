import { computed } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { NEW_ASSISTANT_SESSION_MODAL } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import type { ChatRequest } from '@/features/ai/assistant/assistant.types';
import NewAssistantSessionModal from './NewAssistantSessionModal.vue';

const { openWithErrorHelper, trackUserOpenedAssistant } = vi.hoisted(() => ({
	openWithErrorHelper: vi.fn(),
	trackUserOpenedAssistant: vi.fn(),
}));

vi.mock('../../chatPanel.store', () => ({
	useChatPanelStore: () => ({
		openWithErrorHelper,
		openWithCredHelp: vi.fn(),
	}),
}));

vi.mock('@/features/ai/assistant/assistant.store', () => ({
	useAssistantStore: () => ({
		trackUserOpenedAssistant,
	}),
}));

vi.mock('@/app/composables/useWorkflowId', () => ({
	useWorkflowId: () => computed(() => 'wf-1'),
}));

const renderComponent = createComponentRenderer(NewAssistantSessionModal);

const errorContext = {
	error: { name: 'NodeOperationError', message: 'failed' },
	node: { name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' },
} as ChatRequest.ErrorContext;

function renderOpen() {
	createTestingPinia({ stubActions: false });
	const uiStore = useUIStore();
	uiStore.openModal(NEW_ASSISTANT_SESSION_MODAL);

	const rendered = renderComponent({
		props: {
			name: NEW_ASSISTANT_SESSION_MODAL,
			data: { context: { errorHelp: errorContext } },
		},
	});

	return { ...rendered, uiStore };
}

describe('NewAssistantSessionModal', () => {
	it('stays closed until the modal store opens it', () => {
		createTestingPinia({ stubActions: false });
		const { queryByTestId } = renderComponent({
			props: {
				name: NEW_ASSISTANT_SESSION_MODAL,
				data: { context: { errorHelp: errorContext } },
			},
		});

		expect(queryByTestId('new-assistant-session-modal')).not.toBeInTheDocument();
	});

	it('opens from the modal store and closes when the dialog requests close', async () => {
		const { findByTestId, uiStore } = renderOpen();

		expect(await findByTestId('new-assistant-session-modal')).toBeInTheDocument();

		await userEvent.click(await findByTestId('dialog-close-button'));

		expect(uiStore.modalsById[NEW_ASSISTANT_SESSION_MODAL]?.open).toBe(false);
	});

	it('starts a new session and closes the dialog', async () => {
		openWithErrorHelper.mockResolvedValue(undefined);
		const { findByRole, uiStore } = renderOpen();

		await userEvent.click(await findByRole('button', { name: 'Start new session' }));

		expect(openWithErrorHelper).toHaveBeenCalledWith(errorContext);
		expect(trackUserOpenedAssistant).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'error', task: 'error', workflowId: 'wf-1' }),
		);
		expect(uiStore.modalsById[NEW_ASSISTANT_SESSION_MODAL]?.open).toBe(false);
	});
});
