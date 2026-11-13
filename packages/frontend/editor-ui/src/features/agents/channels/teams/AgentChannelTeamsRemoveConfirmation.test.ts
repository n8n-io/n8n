import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelTeamsRemoveConfirmation from './AgentChannelTeamsRemoveConfirmation.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function mountConfirmation(props = { open: true, loading: false }) {
	return mount(AgentChannelTeamsRemoveConfirmation, {
		props,
		global: {
			stubs: {
				AgentChannelRemoveConfirmation: {
					props: ['open', 'loading', 'title', 'description', 'confirmLabel', 'confirmTestId'],
					emits: ['cancel', 'confirm'],
					template: `
						<div :data-open="open" :data-loading="loading">
							<h2>{{ title }}</h2>
							<p>{{ description }}</p>
							<button :data-testid="confirmTestId" @click="$emit('confirm')">{{ confirmLabel }}</button>
							<button data-testid="cancel" @click="$emit('cancel')" />
						</div>
					`,
				},
			},
		},
	});
}

describe('AgentChannelTeamsRemoveConfirmation', () => {
	it('shows the Teams removal copy', () => {
		const wrapper = mountConfirmation();

		expect(wrapper.get('h2').text()).toBe('agents.channels.teams.remove.title');
		expect(wrapper.get('p').text()).toBe('agents.channels.teams.remove.description');
		expect(wrapper.get('[data-testid="teams-remove-confirm"]').text()).toBe(
			'agents.channels.teams.remove.confirm',
		);
	});

	it('passes on whether it is open and loading', () => {
		const wrapper = mountConfirmation({ open: true, loading: true });

		expect(wrapper.attributes('data-open')).toBe('true');
		expect(wrapper.attributes('data-loading')).toBe('true');
	});

	it('confirms the removal without an external resource to delete', async () => {
		const wrapper = mountConfirmation();

		await wrapper.get('[data-testid="teams-remove-confirm"]').trigger('click');

		expect(wrapper.emitted('confirm')).toEqual([[false]]);
	});

	it('passes on a cancel', async () => {
		const wrapper = mountConfirmation();

		await wrapper.get('[data-testid="cancel"]').trigger('click');

		expect(wrapper.emitted('cancel')).toHaveLength(1);
	});
});
