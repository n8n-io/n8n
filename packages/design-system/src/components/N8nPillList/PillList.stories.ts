import type { StoryFn } from '@storybook/vue3';
<<<<<<< HEAD
import { ref, watch } from 'vue';
=======
>>>>>>> ADO-3035

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
<<<<<<< HEAD
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	// Generics make this difficult to type
	components: N8nPillList as never,
	template: '<n8n-pill-list v-bind="args"  />',
=======
	setup: () => ({ args: { ...args, modelValue: undefined }, model: args.modelValue }),
	props: Object.keys(argTypes),
	// Generics make this difficult to type
	components: N8nPillList as never,
	template: '<n8n-pill-list v-bind="args" v-model="model" />',
>>>>>>> ADO-3035
});

export const PillList = Template.bind({});
PillList.args = {
	modelValue: {
<<<<<<< HEAD
		propC: 'propC value that will be changed in the slot',
=======
		propC: 'propC pre-existing initial value',
>>>>>>> ADO-3035
	},
	inputs: [
		{
			name: 'propA',
<<<<<<< HEAD
			tooltip: 'propA tooltip',
			default: 'propA default',
		},
		{
			name: 'propB',
			tooltip: 'propB tooltip',
			default: 'propB default',
		},
		{
			name: 'propC',
			tooltip: 'propC tooltip',
			default: 'propC default',
=======
			initialValue: false,
		},
		{
			name: 'propB',
			initialValue: 0,
		},
		{
			name: 'propC',
			initialValue: 'propC default',
>>>>>>> ADO-3035
		},
	],
};
