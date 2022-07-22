/* tslint:disable:variable-name */

import N8nPulse from './Pulse.vue';
import { StoryFn } from "@storybook/vue";

export default {
	title: 'Atoms/Pulse',
	component: N8nPulse,
	argTypes: {
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

export const Default: StoryFn = (args, {argTypes}) => ({
	components: {
		N8nPulse,
	},
	template: '<n8n-pulse> yo </n8n-pulse>',
});
