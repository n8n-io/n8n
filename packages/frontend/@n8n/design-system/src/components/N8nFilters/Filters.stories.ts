import type { StoryFn } from '@storybook/vue3';
import N8nFilters from './Filters.vue';

export default {
	title: 'Atoms/N8nFilters',
	component: N8nFilters,
	argTypes: {},
};

const Template: StoryFn = (args) => ({
	components: {
		N8nFilters,
	},
	setup() {
		return { args };
	},
	template: '<N8nFilters v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
