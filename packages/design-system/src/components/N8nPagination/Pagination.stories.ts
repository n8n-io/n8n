import type { StoryFn } from '@storybook/vue3';
import N8nPagination from './Pagination.vue';

export default {
	title: 'Atoms/Pagination',
	component: N8nPagination,
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nPagination,
	},
	template: '<n8n-pagination v-bind="args" />',
});

export const Pagination: StoryFn = Template.bind({});
Pagination.args = {
	currentPage: 1,
	pagerCount: 5,
	pageSize: 10,
	total: 100,
};
