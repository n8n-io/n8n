import { configure, fireEvent, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';

import AgentDuplicateModal from '../components/AgentDuplicateModal.vue';
import type { AgentDuplicateModalData } from '../components/AgentDuplicateModal.vue';

// Components use `data-testid`; the global setup configures `data-test-id`.
configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const stubs = {
	Modal: {
		props: ['name', 'width', 'closeOnClickModal', 'closeOnPressEscape', 'showClose'],
		template:
			'<div role="dialog" :data-close-on-click-modal="closeOnClickModal" :data-close-on-press-escape="closeOnPressEscape" :data-show-close="showClose"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
	},
	N8nHeading: { template: '<h2><slot /></h2>' },
	N8nText: { template: '<span v-bind="$attrs"><slot /></span>' },
	N8nButton: {
		props: ['disabled', 'loading'],
		template:
			'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
	},
	N8nInput: {
		props: ['modelValue', 'label', 'placeholder', 'required'],
		emits: ['update:modelValue', 'enter'],
		template:
			'<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown.enter="$emit(\'enter\')" />',
	},
};

const MODAL_NAME = 'agentDuplicateModal';

function renderModal(dataOverrides: Partial<AgentDuplicateModalData> = {}) {
	const onConfirm = vi.fn().mockResolvedValue(undefined);
	const renderComponent = createComponentRenderer(AgentDuplicateModal, { global: { stubs } });
	const result = renderComponent({
		props: {
			modalName: MODAL_NAME,
			data: {
				projectId: 'project-1',
				agentId: 'agent-1',
				name: 'Support Agent',
				existingNames: ['Support Agent', 'Other Agent'],
				onConfirm,
				...dataOverrides,
			} satisfies AgentDuplicateModalData,
		},
	});
	return { ...result, onConfirm };
}

describe('AgentDuplicateModal', () => {
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		uiStore = mockedStore(useUIStore);
		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('prefills the name with "<source> (copy)"', () => {
		const { getByTestId } = renderModal();

		expect(getByTestId('agent-duplicate-name-input')).toHaveValue('Support Agent (copy)');
	});

	it('disables confirm and shows a name-taken error when the name matches an existing agent', async () => {
		const { getByTestId, getByText } = renderModal();

		await fireEvent.update(getByTestId('agent-duplicate-name-input'), 'Support Agent');

		expect(getByText('agents.duplicate.modal.button.nameTaken')).toBeInTheDocument();
		expect(getByTestId('agent-duplicate-confirm')).toBeDisabled();
	});

	it('disables confirm when the name is empty', async () => {
		const { getByTestId } = renderModal();

		await fireEvent.update(getByTestId('agent-duplicate-name-input'), '   ');

		expect(getByTestId('agent-duplicate-confirm')).toBeDisabled();
	});

	it('calls onConfirm with the trimmed name and closes the modal', async () => {
		const { getByTestId, onConfirm } = renderModal();

		await fireEvent.update(getByTestId('agent-duplicate-name-input'), 'Triage Bot');
		await fireEvent.click(getByTestId('agent-duplicate-confirm'));

		await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Triage Bot'));
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('keeps the modal open when onConfirm rejects', async () => {
		const onConfirm = vi.fn().mockRejectedValue(new Error('boom'));
		const { getByTestId } = renderModal({ onConfirm });

		await fireEvent.update(getByTestId('agent-duplicate-name-input'), 'Triage Bot');
		await fireEvent.click(getByTestId('agent-duplicate-confirm'));

		await waitFor(() => expect(onConfirm).toHaveBeenCalled());
		expect(uiStore.closeModal).not.toHaveBeenCalled();
	});

	it('trims the name before checking for collisions and calling onConfirm', async () => {
		const { getByTestId, onConfirm } = renderModal();

		await fireEvent.update(getByTestId('agent-duplicate-name-input'), '  Triage Bot  ');
		await fireEvent.click(getByTestId('agent-duplicate-confirm'));

		await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Triage Bot'));
	});

	it('blocks dismissal while a duplicate is submitting', async () => {
		// Never resolves so the modal stays in the submitting state.
		const onConfirm = vi.fn<(name: string) => Promise<void>>(() => new Promise<void>(() => {}));
		const { getByTestId, getByRole } = renderModal({ onConfirm });

		const dialog = getByRole('dialog');
		// Before submit, dismissal is allowed.
		expect(dialog).toHaveAttribute('data-show-close', 'true');

		await fireEvent.update(getByTestId('agent-duplicate-name-input'), 'Triage Bot');
		await fireEvent.click(getByTestId('agent-duplicate-confirm'));

		await waitFor(() => expect(onConfirm).toHaveBeenCalled());
		// While submitting, all dismissal paths are disabled.
		expect(dialog).toHaveAttribute('data-show-close', 'false');
		expect(dialog).toHaveAttribute('data-close-on-click-modal', 'false');
		expect(dialog).toHaveAttribute('data-close-on-press-escape', 'false');
	});
});
