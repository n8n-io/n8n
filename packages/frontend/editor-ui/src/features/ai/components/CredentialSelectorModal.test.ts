import { shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import CredentialSelectorModal from './CredentialSelectorModal.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

describe('CredentialSelectorModal', () => {
	it('keeps the selector and nested credential editor above its parent modal', () => {
		const wrapper = shallowMount(CredentialSelectorModal, {
			props: {
				modalName: 'agentModelCredentialModal',
				data: {
					credentialType: 'anthropicApi',
					displayName: 'Anthropic',
					initialValue: 'anthropic-credential',
					onSelect: vi.fn(),
					appendToBody: true,
				},
			},
			global: {
				stubs: {
					Modal: {
						name: 'Modal',
						props: ['appendToBody'],
						template: '<div><slot name="content" /></div>',
					},
					CredentialPicker: {
						name: 'CredentialPicker',
						props: ['credentialModalAppendToBody'],
						template: '<div />',
					},
				},
			},
		});

		expect(wrapper.findComponent({ name: 'Modal' }).props('appendToBody')).toBe(true);
		expect(
			wrapper.findComponent({ name: 'CredentialPicker' }).props('credentialModalAppendToBody'),
		).toBe(true);
	});
});
