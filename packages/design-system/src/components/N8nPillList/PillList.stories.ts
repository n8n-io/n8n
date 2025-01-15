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
	setup: () => ({ args: { ...args, modelValue: undefined }, model: args.modelValue }),
	props: Object.keys(argTypes),
	// Generics make this difficult to type
	components: N8nPillList as never,
	template: '<n8n-pill-list v-bind="args" v-model="model" />',
});

export const PillList = Template.bind({});
PillList.args = {
	modelValue: {
		propC: 'propC pre-existing initial value',
	},
	inputs: [
		{
			name: 'propA',
			initialValue: false,
		},
		{
			name: 'propB',
			initialValue: 0,
		},
		{
			name: 'propC',
			initialValue: 'propC default',
		},
	],
};
