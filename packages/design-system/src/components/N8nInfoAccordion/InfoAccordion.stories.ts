/* tslint:disable:variable-name */

import N8nInfoAccordion from './InfoAccordion.vue';
import { StoryFn } from "@storybook/vue";

export default {
	title: 'Atoms/Info Accordion',
	component: N8nInfoAccordion,
	argTypes: {
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

export const Default: StoryFn = (args, {argTypes}) => ({
	props: Object.keys(argTypes),
	components: {
		N8nInfoAccordion,
	},
	template: '<n8n-info-accordion v-bind="$props" @click="onClick" />',
});

Default.args = {
	title: 'my title',
	description: 'my description',
};
