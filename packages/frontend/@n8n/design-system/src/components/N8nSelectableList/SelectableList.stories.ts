import type { StoryFn } from '@storybook/vue3-vite';
import type { Component } from 'vue';
import { ref } from 'vue';

import N8nSelectableList from './SelectableList.vue';

export default {
	title: 'Core/SelectableList',
	component: N8nSelectableList,
	argTypes: {},
	parameters: {
		docs: {
			description: { component: 'A list component with keyboard and pointer selection behavior.' },
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const Template: StoryFn = (args) => ({
	setup: () => {
		const model = ref(args.modelValue);
		return { args, model };
	},
	components: {
		N8nSelectableList: N8nSelectableList as unknown as Component,
	},
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
