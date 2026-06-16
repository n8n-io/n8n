import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { computed } from 'vue';
import type { NodeError } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

vi.mock('@/app/composables/useInjectWorkflowId', () => ({
	useInjectWorkflowId: () => computed(() => 'workflow-1'),
}));

vi.mock('@/features/ai/assistant/composables/useAIAssistantHelpers', () => ({
	useAIAssistantHelpers: () => ({
		getNodeInfoForAssistant: () => ({ authType: undefined, nodeInputData: {}, schemas: [] }),
		processNodeForAssistant: async (node: unknown) => node,
		simplifyErrorForAssistant: (err: { name: string; message: string }) => ({
			name: err.name,
			message: err.message,
		}),
	}),
}));

import ExplainErrorButton from './ExplainErrorButton.vue';
import { useExplainErrorStore } from './explainError.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';

let mockStore: ReturnType<typeof mockedStore<typeof useExplainErrorStore>>;

const renderComponent = createComponentRenderer(ExplainErrorButton);

const node = {
	id: 'n1',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4,
	position: [0, 0],
	parameters: {},
};

const sampleError = {
	name: 'NodeOperationError',
	message: 'Authorization failed',
	description: 'Check creds',
	node,
} as unknown as NodeError;

describe('ExplainErrorButton', () => {
	beforeEach(() => {
		createTestingPinia();
		mockStore = mockedStore(useExplainErrorStore);
		mockStore.state = 'idle';
		mockStore.result = undefined;
		const usersStore = mockedStore(useUsersStore);
		// @ts-expect-error - test mock
		usersStore.currentUser = { firstName: 'Csaba' };
		const settingsStore = mockedStore(useSettingsStore);
		// @ts-expect-error - test mock
		settingsStore.settings = { ai: { allowSendingParameterValues: true } };
	});

	it('renders the trigger button with i18n label', () => {
		const { getByTestId } = renderComponent({ props: { error: sampleError } });
		const button = getByTestId('explain-error-button');
		expect(button).toBeInTheDocument();
		expect(button.textContent).toContain('Explain this error');
	});

	it('calls explain() when clicked', async () => {
		const { getByTestId } = renderComponent({ props: { error: sampleError } });
		await userEvent.click(getByTestId('explain-error-button'));
		expect(mockStore.explain).toHaveBeenCalledWith(
			sampleError,
			expect.objectContaining({ type: 'init-error-helper' }),
		);
	});

	it('shows loading text in the popover when state is loading', async () => {
		mockStore.state = 'loading';
		const { getByTestId, findByText } = renderComponent({ props: { error: sampleError } });
		await userEvent.click(getByTestId('explain-error-button'));
		expect(await findByText('Thinking…')).toBeInTheDocument();
	});

	it('renders the three sections when state is ready and result is structured', async () => {
		mockStore.state = 'ready';
		mockStore.result = {
			kind: 'structured',
			summary: 'The API rejected the request.',
			culprit: 'API key',
			nextStep: 'Rotate the credential.',
		};

		const { getByTestId, findByText } = renderComponent({ props: { error: sampleError } });
		await userEvent.click(getByTestId('explain-error-button'));
		expect(await findByText('Summary')).toBeInTheDocument();
		expect(await findByText('The API rejected the request.')).toBeInTheDocument();
		expect(await findByText('Likely culprit')).toBeInTheDocument();
		expect(await findByText('API key')).toBeInTheDocument();
		expect(await findByText('Try this next')).toBeInTheDocument();
		expect(await findByText('Rotate the credential.')).toBeInTheDocument();
	});

	it('renders raw text fallback when result kind is raw', async () => {
		mockStore.state = 'ready';
		mockStore.result = { kind: 'raw', text: 'Free-form answer.' };

		const { getByTestId, findByText } = renderComponent({ props: { error: sampleError } });
		await userEvent.click(getByTestId('explain-error-button'));
		expect(await findByText('Free-form answer.')).toBeInTheDocument();
	});

	it('renders an error state with a retry button', async () => {
		mockStore.state = 'error';
		const { getByTestId, findByText } = renderComponent({ props: { error: sampleError } });
		await userEvent.click(getByTestId('explain-error-button'));
		const retry = await findByText('Try again');
		await userEvent.click(retry);
		expect(mockStore.retry).toHaveBeenCalledWith(
			sampleError,
			expect.objectContaining({ type: 'init-error-helper' }),
		);
	});
});
