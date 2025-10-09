import type { StoryFn } from '@storybook/vue3-vite';

import N8nPulse from './Pulse.vue';

export default {
	title: 'Atoms/Pulse',
	component: N8nPulse,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

export const Default: StoryFn = () => ({
	components: {
		N8nPulse,
	},
	template: '<n8n-pulse> yo </n8n-pulse>',
});
