/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * `ConfigureChannelCard` is a thin transport adapter around the shared
 * `ChannelSetupCard` (body + composable wiring, tested on its own in
 * `features/ai/shared/components/ChannelSetupCard.test.ts`). Here we only
 * prove the adapter's own job: forwarding props down, mapping the shared
 * `resolve` event onto the `submit` emit, and rendering the resolved-state
 * summary once disabled.
 */
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

vi.mock('@/features/ai/shared/components/ChannelSetupCard.vue', () => ({
	default: {
		props: ['integrationType', 'agentId', 'projectId', 'disabled'],
		emits: ['resolve'],
		// No hardcoded `data-testid` on the root: the adapter passes its own
		// (`configure-channel-card`) as a fallthrough attribute, which would
		// just overwrite one set here anyway.
		template:
			'<div :data-integration-type="integrationType" :data-agent-id="agentId" :data-project-id="projectId" :data-disabled="disabled">' +
			'<button data-testid="mock-resolve-approved" @click="$emit(\'resolve\', { approved: true })" />' +
			'<button data-testid="mock-resolve-skipped" @click="$emit(\'resolve\', { approved: false })" />' +
			'</div>',
	},
}));

import ConfigureChannelCard from '../components/interactive/ConfigureChannelCard.vue';

const defaultProps = {
	integrationType: 'slack',
	agentId: 'agent-1',
	projectId: 'project-1',
};

function mountCard(props: Record<string, unknown> = {}) {
	return mount(ConfigureChannelCard, {
		props: { ...defaultProps, ...props },
		global: {
			stubs: {
				N8nIcon: { template: '<i />', props: ['icon', 'size', 'color'] },
				N8nText: { template: '<span><slot/></span>', props: ['size', 'bold', 'color', 'tag'] },
			},
		},
	});
}

describe('ConfigureChannelCard', () => {
	it('renders the shared channel-setup card with the requested integration wired through', () => {
		const wrapper = mountCard();

		const stub = wrapper.find('[data-testid="configure-channel-card"]');
		expect(stub.exists()).toBe(true);
		expect(stub.attributes('data-integration-type')).toBe('slack');
		expect(stub.attributes('data-agent-id')).toBe('agent-1');
		expect(stub.attributes('data-project-id')).toBe('project-1');
	});

	it('emits { approved: true } when the shared card resolves connected', async () => {
		const wrapper = mountCard();

		await wrapper.find('[data-testid="mock-resolve-approved"]').trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ approved: true }]]);
	});

	it('emits { approved: false } when the shared card resolves skipped', async () => {
		const wrapper = mountCard();

		await wrapper.find('[data-testid="mock-resolve-skipped"]').trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ approved: false }]]);
	});

	it('does not emit submit twice for a duplicate resolve', async () => {
		const wrapper = mountCard();

		const button = wrapper.find('[data-testid="mock-resolve-approved"]');
		await button.trigger('click');
		await button.trigger('click');

		expect(wrapper.emitted('submit')).toHaveLength(1);
	});

	it('renders a connected resolved summary when disabled and resolved as connected', () => {
		const wrapper = mountCard({ disabled: true, resolvedValue: { connected: true } });

		expect(wrapper.find('[data-testid="configure-channel-card"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="mock-resolve-approved"]').exists()).toBe(false);
		expect(wrapper.text()).toContain('agents.channels.modal.connected');
	});

	it('renders a skipped resolved summary when disabled and resolved as not connected', () => {
		const wrapper = mountCard({ disabled: true, resolvedValue: { approved: false } });

		expect(wrapper.text()).toContain('agents.chat.configureChannel.skipped');
	});
});
