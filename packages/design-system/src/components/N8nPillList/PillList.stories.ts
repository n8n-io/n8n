import type { StoryFn } from '@storybook/vue3';

import N8nPillList from './PillList.vue';

export default {
	title: 'Modules/PillList',
	component: N8nPillList,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	// Generics make this difficult to type
	components: N8nPillList as never,
	template: '<n8n-pill-list v-bind="args"  />',
});

export const PillList = Template.bind({});
PillList.args = {
	modelValue: {
		propC: 'propC value that will be changed in the slot',
	},
	inputs: [
		{
			name: 'propA',
			default: 'propA default',
		},
		{
			name: 'propB',
			default: 'propB default',
		},
		{
			name: 'propC',
			default: 'propC default',
		},
	],
};
