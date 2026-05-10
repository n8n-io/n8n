import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';

import AgentCaseMemoryCredentialModal from '../components/AgentCaseMemoryCredentialModal.vue';

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const ModalStub = defineComponent({
	props: ['name', 'width', 'center', 'maxWidth', 'minHeight'],
	template: `
		<div role="dialog">
			<slot name="header" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
});

const CredentialPickerStub = defineComponent({
	props: ['appName', 'credentialType', 'selectedCredentialId', 'showDelete'],
	emits: ['credentialSelected', 'credentialDeselected'],
	template: `
		<div data-test-id="credential-picker-stub" :data-credential-type="credentialType">
			<button data-test-id="select-credential" @click="$emit('credentialSelected', 'credential-1')" />
			<button data-test-id="deselect-credential" @click="$emit('credentialDeselected')" />
		</div>
	`,
});

const MODAL_NAME = 'agentCaseMemoryCredentialModal';

function renderModal({ onSelect = vi.fn() }: { onSelect?: (credentialId: string) => void } = {}) {
	const renderComponent = createComponentRenderer(AgentCaseMemoryCredentialModal, {
		global: {
			stubs: {
				Modal: ModalStub,
				CredentialIcon: { template: '<span />', props: ['credentialTypeName', 'size'] },
				CredentialPicker: CredentialPickerStub,
				N8nButton: {
					props: ['variant', 'disabled'],
					template: '<button v-bind="$attrs" :disabled="disabled"><slot /></button>',
				},
				N8nHeading: { template: '<h2><slot /></h2>' },
				N8nText: { template: '<p><slot /></p>' },
			},
		},
	});

	return renderComponent({
		props: {
			modalName: MODAL_NAME,
			data: {
				initialValue: null,
				onSelect,
			},
		},
	});
}

describe('AgentCaseMemoryCredentialModal', () => {
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		uiStore = mockedStore(useUIStore);
		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
	});

	it('keeps confirm disabled until an OpenAI credential is selected', async () => {
		const onSelect = vi.fn();
		const { getByTestId } = renderModal({ onSelect });

		expect(getByTestId('agent-case-memory-credential-picker')).toHaveAttribute(
			'data-credential-type',
			'openAiApi',
		);
		expect(getByTestId('agent-case-memory-credential-confirm')).toBeDisabled();

		await fireEvent.click(getByTestId('select-credential'));
		await fireEvent.click(getByTestId('agent-case-memory-credential-confirm'));

		expect(onSelect).toHaveBeenCalledWith('credential-1');
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('closes without selecting a credential when canceled', async () => {
		const onSelect = vi.fn();
		const { getByTestId } = renderModal({ onSelect });

		await fireEvent.click(getByTestId('agent-case-memory-credential-cancel'));

		expect(onSelect).not.toHaveBeenCalled();
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});
});
