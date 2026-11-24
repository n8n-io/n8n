/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import type { AgentVersionListItemDto } from '@n8n/api-types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (k: string, opts?: { interpolate?: Record<string, string> }) => {
			if (!opts?.interpolate) return k;
			return `${k}:${Object.values(opts.interpolate).join(',')}`;
		},
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nIconButton: { template: '<button />' },
	N8nTooltip: { template: '<span :title="content"><slot /></span>', props: ['content'] },
	N8nActionToggle: {
		name: 'N8nActionToggle',
		template:
			'<div data-testid="stub-action-toggle" :data-actions="JSON.stringify(actions)" @click="$emit(\'action\', actions[0]?.value)" />',
		props: ['actions', 'placement'],
		emits: ['action'],
	},
	N8nText: {
		name: 'N8nText',
		template: '<span><slot /></span>',
		props: ['size', 'bold', 'color', 'tag'],
	},
}));

import AgentVersionListItem from '../components/VersionHistory/AgentVersionListItem.vue';

function makeItem(overrides: Partial<AgentVersionListItemDto> = {}): AgentVersionListItemDto {
	return {
		versionId: 'abcdef1234567890',
		agentId: 'agent-1',
		createdAt: '2026-01-02T10:11:12.000Z',
		updatedAt: '2026-01-02T10:11:12.000Z',
		author: 'Ada Lovelace',
		isActive: false,
		...overrides,
	};
}

const actions = [
	{ label: 'revert', value: 'revert', disabled: false },
	{ label: 'publish', value: 'publish', disabled: false },
];

describe('AgentVersionListItem', () => {
	it('renders the version label, author, and timestamp', () => {
		const wrapper = mount(AgentVersionListItem, {
			props: {
				item: makeItem(),
				actions,
			},
		});

		expect(wrapper.text()).toContain('Version abcdef12');
		expect(wrapper.text()).toContain('Ada Lovelace');
	});

	it('shows the last publisher separately from the saved-version author', () => {
		const wrapper = mount(AgentVersionListItem, {
			props: {
				item: makeItem({
					lastPublished: {
						author: 'Grace Hopper',
						createdAt: '2026-02-03T10:00:00.000Z',
						isLegacy: false,
					},
				}),
				actions,
			},
		});
		expect(wrapper.text()).toContain('Ada Lovelace');
		expect(wrapper.find('[title]').attributes('title')).toContain('Grace Hopper');
	});

	it('renders the published badge when the version is active', () => {
		const wrapper = mount(AgentVersionListItem, {
			props: {
				item: makeItem({ isActive: true }),
				actions,
			},
		});

		expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe(
			'agents.versionHistory.item.publishedBadge',
		);
	});

	it('does not render the published badge when the version is inactive', () => {
		const wrapper = mount(AgentVersionListItem, {
			props: {
				item: makeItem({ isActive: false }),
				actions,
			},
		});

		expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe(
			'agents.versionHistory.item.savedVersion',
		);
	});

	it('emits an action event with the versionId when the action toggle fires', async () => {
		const wrapper = mount(AgentVersionListItem, {
			props: {
				item: makeItem({ versionId: 'v-target' }),
				actions,
			},
		});

		await wrapper.findComponent({ name: 'N8nActionToggle' }).trigger('click');

		const emitted = wrapper.emitted('action');
		expect(emitted).toBeTruthy();
		expect(emitted?.[0]?.[0]).toEqual({ action: 'revert', versionId: 'v-target' });
	});

	it('hides the action toggle when the actions list is empty', () => {
		const wrapper = mount(AgentVersionListItem, {
			props: {
				item: makeItem({ isActive: true }),
				actions: [],
			},
		});

		expect(wrapper.find('[data-testid="stub-action-toggle"]').exists()).toBe(false);
	});
	it('shows the saved name and description while marking the current draft', () => {
		const wrapper = mount(AgentVersionListItem, {
			props: {
				item: makeItem({
					name: 'Release notes',
					description: 'Adds a support schedule.',
					isCurrent: true,
				}),
				actions,
			},
		});
		expect(wrapper.text()).toContain('Release notes');
		expect(wrapper.text()).toContain('Adds a support schedule.');
		expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe(
			'agents.versionHistory.item.currentDraft',
		);
	});
	it('uses the workflow current-changes label for an unnamed current draft', () => {
		const wrapper = mount(AgentVersionListItem, {
			props: { item: makeItem({ isCurrent: true }), actions },
		});
		expect(wrapper.text()).toContain('workflowHistory.item.currentChanges');
	});
});
