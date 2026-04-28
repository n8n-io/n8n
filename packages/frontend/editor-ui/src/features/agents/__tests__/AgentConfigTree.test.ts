/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentConfigTree from '../components/AgentConfigTree.vue';
import type { AgentJsonConfig } from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate?.count ?? key,
	}),
}));

describe('AgentConfigTree', () => {
	it('renders a Skills section with the configured skill count', () => {
		const config: AgentJsonConfig = {
			name: 'Agent One',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Be helpful',
			skills: [
				{
					id: 'support-triage',
					name: 'Support triage',
					enabled: true,
					definition: 'Classify requests.',
				},
				{
					id: 'renewal-risk',
					name: 'Renewal risk',
					enabled: false,
					definition: 'Summarize risk.',
				},
			],
		};

		const wrapper = mount(AgentConfigTree, {
			props: { config, selectedKey: null },
			global: {
				stubs: {
					N8nIcon: { template: '<i />', props: ['icon', 'size'] },
					N8nText: { template: '<span><slot /></span>', props: ['tag', 'size', 'color'] },
					N8nBadge: { template: '<span data-testid="agent-config-tree-count"><slot /></span>' },
				},
			},
		});

		const skillsRow = wrapper
			.findAll('[data-testid="agent-config-tree-item"]')
			.find((row) => row.attributes('data-key') === 'skills');

		expect(skillsRow?.exists()).toBe(true);
		expect(skillsRow?.text()).toContain('2');
	});
});
