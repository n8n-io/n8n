import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';

import AgentKnowledgeConnectionsModal from '../components/AgentKnowledgeConnectionsModal.vue';

const { getAiqHealthMock } = vi.hoisted(() => ({
	getAiqHealthMock: vi.fn(),
}));

vi.mock('../composables/useAiqKnowledgeApi', () => ({
	AiqKnowledgeApiError: class AiqKnowledgeApiError extends Error {
		constructor(
			message: string,
			readonly status?: number,
		) {
			super(message);
		}
	},
	getAiqHealth: getAiqHealthMock,
	normalizeAiqBaseUrl: (baseUrl: string) => baseUrl.trim().replace(/\/+$/, ''),
}));

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const ModalStub = {
	props: ['name', 'width', 'customClass'],
	template: `
		<div role="dialog">
			<slot name="header" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

function renderModal(onConfirm = vi.fn()) {
	const renderComponent = createComponentRenderer(AgentKnowledgeConnectionsModal, {
		global: {
			stubs: {
				Modal: ModalStub,
				N8nButton: {
					props: ['loading', 'disabled'],
					template: '<button v-bind="$attrs"><slot /></button>',
				},
				N8nHeading: { template: '<h2><slot /></h2>' },
				N8nIcon: { template: '<i />' },
				N8nInput: {
					props: ['modelValue', 'placeholder'],
					emits: ['update:modelValue'],
					template:
						'<input v-bind="$attrs" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
				},
				N8nText: { template: '<span v-bind="$attrs"><slot /></span>' },
			},
		},
	});

	return renderComponent({
		props: {
			modalName: 'agentKnowledgeConnectionModal',
			data: { onConfirm },
		},
	});
}

describe('AgentKnowledgeConnectionsModal', () => {
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		uiStore = mockedStore(useUIStore);
		uiStore.closeModal = vi.fn();
	});

	it('shows the NVIDIA AI-Q connection row and base URL prompt', async () => {
		const { container, getByText } = renderModal();

		expect(getByText('agents.builder.aiqConnection.providerName')).toBeInTheDocument();

		await fireEvent.click(container.querySelector('[data-testid="agent-aiq-connect"]') as Element);

		expect(container.querySelector('[data-testid="agent-aiq-base-url-input"]')).toBeInTheDocument();
	});

	it('validates health and confirms the normalized base URL', async () => {
		getAiqHealthMock.mockResolvedValueOnce({});
		const onConfirm = vi.fn();
		const { container } = renderModal(onConfirm);

		await fireEvent.click(container.querySelector('[data-testid="agent-aiq-connect"]') as Element);
		await fireEvent.update(
			container.querySelector('[data-testid="agent-aiq-base-url-input"]') as Element,
			' https://aiq.example.test/// ',
		);
		await fireEvent.click(
			container.querySelector('[data-testid="agent-aiq-confirm-connect"]') as Element,
		);

		await waitFor(() => {
			expect(getAiqHealthMock).toHaveBeenCalledWith('https://aiq.example.test');
			expect(onConfirm).toHaveBeenCalledWith({ baseUrl: 'https://aiq.example.test' });
			expect(uiStore.closeModal).toHaveBeenCalledWith('agentKnowledgeConnectionModal');
		});
	});

	it('shows an inline error when health fails', async () => {
		getAiqHealthMock.mockRejectedValueOnce(new Error('failed'));
		const onConfirm = vi.fn();
		const { container } = renderModal(onConfirm);

		await fireEvent.click(container.querySelector('[data-testid="agent-aiq-connect"]') as Element);
		await fireEvent.update(
			container.querySelector('[data-testid="agent-aiq-base-url-input"]') as Element,
			'https://aiq.example.test',
		);
		await fireEvent.click(
			container.querySelector('[data-testid="agent-aiq-confirm-connect"]') as Element,
		);

		await waitFor(() => {
			expect(container.querySelector('[data-testid="agent-aiq-connect-error"]')).toHaveTextContent(
				'agents.builder.aiqConnection.connectionFailed',
			);
			expect(onConfirm).not.toHaveBeenCalled();
		});
	});
});
