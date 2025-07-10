import type { StoryFn } from '@storybook/vue3';

import N8nSelectableList from './SelectableList.vue';

export default {
	title: 'Modules/SelectableList',
	component: N8nSelectableList,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({
		args: { ...args, modelValue: undefined },
		model: args.modelValue,
	}),
	props: Object.keys(argTypes),
	// Generics make this difficult to type
	components: N8nSelectableList as never,
	template:
		'<n8n-selectable-list v-bind="args" v-model="model"><template #displayItem="{ name }">Slot content for {{name}}</template></n8n-selectable-list>',
});

export const SelectableList = Template.bind({});
SelectableList.args = {
	modelValue: {
		propC: 'propC pre-existing initial value',
	},
	inputs: [
		{
			name: 'propC',
			initialValue: 'propC default',
		},
		{
			name: 'propB',
			initialValue: 0,
		},
		{
			name: 'propA',
			initialValue: false,
		},
	],
};
