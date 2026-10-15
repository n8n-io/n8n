import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelTeamsRemoveConfirmation from './AgentChannelTeamsRemoveConfirmation.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function mountConfirmation(loading = false) {
	return mount(AgentChannelTeamsRemoveConfirmation, {
		props: { open: true, loading },
		global: {
			stubs: {
				Dialog: {
					props: ['open', 'showCloseButton'],
					emits: ['update:open'],
					template:
						'<div v-if="open"><button data-testid="close" @click="$emit(\'update:open\', false)" /><slot /></div>',
				},
				DialogHeader: { template: '<header><slot /></header>' },
				DialogTitle: { template: '<h2><slot /></h2>' },
				DialogDescription: { template: '<p><slot /></p>' },
				DialogFooter: { template: '<footer><slot /></footer>' },
				N8nText: { template: '<span><slot /></span>' },
				N8nButton: {
					emits: ['click'],
					template: '<button @click="$emit(\'click\')"><slot /></button>',
				},
			},
		},
	});
}

describe('AgentChannelTeamsRemoveConfirmation', () => {
	it('confirms the removal', async () => {
		const wrapper = mountConfirmation();

		await wrapper.get('[data-testid="teams-remove-confirm"]').trigger('click');

		expect(wrapper.emitted('confirm')).toEqual([[false]]);
	});

	it('cancels on close, but not while the removal runs', async () => {
		const idle = mountConfirmation();
		await idle.get('[data-testid="close"]').trigger('click');
		expect(idle.emitted('cancel')).toHaveLength(1);

		const busy = mountConfirmation(true);
		await busy.get('[data-testid="close"]').trigger('click');
		expect(busy.emitted('cancel')).toBeUndefined();
	});
});
