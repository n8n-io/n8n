/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AiModelSelectorDropdown from '../AiModelSelectorDropdown.vue';

vi.mock('@n8n/design-system', () => ({
	N8nBadge: { template: '<span><slot /></span>', props: ['theme', 'size', 'showBorder'] },
	N8nButton: { template: '<button><slot /></button>', props: ['disabled'] },
	N8nDropdownMenu: {
		name: 'N8nDropdownMenu',
		props: ['items'],
		template:
			'<div><div v-for="item in items" :key="item.id"><slot name="item-trailing" :item="item" :ui="{ class: `trailing` }" /></div></div>',
	},
	N8nIcon: { template: '<span />', props: ['icon', 'size', 'color'] },
	N8nText: { template: '<span><slot /></span>', props: ['size', 'color'] },
	N8nTooltip: {
		name: 'N8nTooltip',
		props: ['content', 'placement', 'teleported'],
		template: '<span data-testid="tooltip"><slot /></span>',
	},
}));

describe('AiModelSelectorDropdown', () => {
	it('passes item tooltip teleport settings to the tooltip', () => {
		const tooltipData = {
			description: 'Get 100 free OpenAI API credits. Try it with gpt-5-mini.',
			descriptionTooltipTeleported: false,
		};
		const wrapper = mount(AiModelSelectorDropdown, {
			props: {
				items: [
					{
						id: 'openai::freeCredits::gpt-5-mini',
						label: 'Use free OpenAI credits',
						data: tooltipData,
					},
				],
				selectedLabel: 'Choose model',
				credentialsMissingLabel: 'Credentials missing',
				noMatchLabel: 'No match',
				dataTestId: 'agent-model-selector',
				credentialDataTestId: 'agent-model-selector-credential',
				maxSelectedNameChars: 30,
			},
		});

		expect(wrapper.findComponent({ name: 'N8nTooltip' }).props('teleported')).toBe(false);
	});
});
