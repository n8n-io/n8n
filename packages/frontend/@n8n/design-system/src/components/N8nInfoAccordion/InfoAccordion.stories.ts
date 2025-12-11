import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nInfoAccordion from './InfoAccordion.vue';

export default {
	title: 'Atoms/Info Accordion',
	component: N8nInfoAccordion,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	onClick: action('click'),
};

export const Default: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nInfoAccordion,
	},
	template: '<n8n-info-accordion v-bind="args" @click="onClick" />',
	methods,
});

Default.args = {
	title: 'my title',
	description: 'my description',
};
