import type { StoryFn } from '@storybook/vue';
import N8nPagination from './Pagination.vue';

export default {
	title: 'Atoms/Pagination',
	component: N8nPagination,
};

const Template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nPagination,
	},
	template: '<n8n-pagination v-bind="$props" />',
});

export const Pagination: StoryFn = Template.bind({});
Pagination.args = {
	currentPage: 1,
	pagerCount: 5,
	pageSize: 10,
	total: 100,
};
