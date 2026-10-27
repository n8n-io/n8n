import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import CredentialSelectorModal from './CredentialSelectorModal.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

describe('CredentialSelectorModal', () => {
	it('keeps the selector and nested credential editor above its parent modal', () => {
		const wrapper = shallowMount(CredentialSelectorModal, {
			props: {
				modalName: 'chatCredentialSelectorModal',
				data: {
					credentialType: 'anthropicApi',
					displayName: 'Anthropic',
					initialValue: 'anthropic-credential',
					onSelect: vi.fn(),
					appendToBody: true,
				},
			},
			global: {
				renderStubDefaultSlot: true,
				plugins: [createTestingPinia()],
				stubs: {
					CredentialPicker: {
						name: 'CredentialPicker',
						props: ['credentialModalAppendToBody'],
						template: '<div />',
					},
				},
			},
		});

		expect(wrapper.findComponent({ name: 'Dialog' }).props('stacked')).toBe(true);
		expect(
			wrapper.findComponent({ name: 'CredentialPicker' }).props('credentialModalAppendToBody'),
		).toBe(true);
	});

	it('opens from the modal store and closes when the dialog requests close', async () => {
		createTestingPinia({ stubActions: false });
		const uiStore = useUIStore();
		const modalName = 'chatCredentialSelectorModal';
		uiStore.openModal(modalName);

		const { findByRole, findByTestId, queryByRole } = createComponentRenderer(
			CredentialSelectorModal,
			{
				global: {
					stubs: {
						CredentialPicker: { template: '<div />' },
						CredentialIcon: { template: '<div />' },
					},
				},
			},
		)({
			props: {
				modalName,
				data: {
					credentialType: 'anthropicApi',
					displayName: 'Anthropic',
					initialValue: null,
					onSelect: vi.fn(),
				},
			},
		});

		expect(await findByRole('dialog')).toBeInTheDocument();

		await userEvent.click(await findByTestId('dialog-close-button'));

		expect(uiStore.modalsById[modalName]?.open).toBe(false);
		await waitFor(() => {
			expect(queryByRole('dialog')).not.toBeInTheDocument();
		});
	});
});
