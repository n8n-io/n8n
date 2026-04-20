import type { StoryFn } from '@storybook/vue3-vite';

import N8nBadge from './Badge.vue';
import { BADGE_THEME } from '@n8n/design-system/types/badge';

const SIZE_OPTIONS = ['small', 'medium', 'large'] as const;

export default {
	title: 'Core/Badge',
	component: N8nBadge,
	argTypes: {
		theme: {
			control: 'select',
			options: BADGE_THEME,
		},
		size: {
			control: 'select',
			options: SIZE_OPTIONS,
		},
	},

	parameters: {
		docs: {
			description: { component: 'A compact status label for highlighting state or metadata.' },
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nBadge,
	},
	template: '<n8n-badge v-bind="args">Badge</n8n-badge>',
});

export const Badge = Template.bind({});
Badge.args = {};
