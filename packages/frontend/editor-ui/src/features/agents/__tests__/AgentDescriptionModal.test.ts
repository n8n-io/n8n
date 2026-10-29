import { configure, fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';

import AgentDescriptionModal from '../components/AgentDescriptionModal.vue';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const stubs = {
	AgentModal: AgentModalTestStub,
	N8nText: { template: '<span><slot /></span>' },
	N8nButton: {
		props: ['disabled'],
		template:
			'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
	},
	N8nInput: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template:
			'<textarea v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
	},
};

const MODAL_NAME = 'agentDescriptionModal';

describe('AgentDescriptionModal', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		const uiStore = mockedStore(useUIStore);
		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
	});

	it('saves the trimmed description and disables save when unchanged', async () => {
		const onConfirm = vi.fn();
		const { getByTestId } = createComponentRenderer(AgentDescriptionModal, {
			global: { stubs },
		})({
			props: {
				modalName: MODAL_NAME,
				data: { agentName: 'Support Agent', description: 'Old', onConfirm },
			},
		});

		const save = getByTestId('agent-description-save');
		expect(save).toBeDisabled();

		await fireEvent.update(getByTestId('agent-description-input'), '  New description  ');
		expect(save).not.toBeDisabled();
		await fireEvent.click(save);

		expect(onConfirm).toHaveBeenCalledWith('New description');
	});
});
