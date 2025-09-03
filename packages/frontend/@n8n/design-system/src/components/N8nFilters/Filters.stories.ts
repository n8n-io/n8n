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

export const WithFiltersAndActions = Template.bind({});
WithFiltersAndActions.args = {
	filters: [
		{
			label: 'Status',
			type: 'single',
			options: [
				{ name: 'Active', id: 'active', value: 'active' },
				{ name: 'Inactive', id: 'inactive', value: 'inactive' },
				{ name: 'Pending', id: 'pending', value: 'pending' },
			],
		},
		{
			label: 'Tags',
			type: 'multi',
			options: [
				{ name: 'Important', id: 'important', value: 'important' },
				{ name: 'Work', id: 'work', value: 'work' },
				{ name: 'Personal', id: 'personal', value: 'personal' },
				{ name: 'Urgent', id: 'urgent', value: 'urgent' },
			],
		},
		{
			label: 'Priority',
			type: 'single',
			options: [
				{ name: 'High', id: 'high', value: 'high' },
				{ name: 'Medium', id: 'medium', value: 'medium' },
				{ name: 'Low', id: 'low', value: 'low' },
			],
		},
	],
	actions: [
		{
			label: 'Search',
			icon: 'search',
			tooltip: 'Search',
		},
		{
			label: 'Export',
			icon: 'download',
			tooltip: 'Export data',
		},
	],
	primaryActionText: 'Add New',
	noTertiaryActions: false,
};

export const WithPrimaryActionOnly = Template.bind({});
WithPrimaryActionOnly.args = {
	primaryActionText: 'Create Workflow',
	noTertiaryActions: true,
};

export const WithMultiSelectFilter = Template.bind({});
WithMultiSelectFilter.args = {
	filters: [
		{
			label: 'Categories',
			type: 'multi',
			allowCustomValues: true,
			options: [
				{ name: 'Marketing', id: 'marketing', value: 'marketing' },
				{ name: 'Sales', id: 'sales', value: 'sales' },
				{ name: 'Support', id: 'support', value: 'support' },
				{ name: 'Development', id: 'development', value: 'development' },
			],
		},
	],
	actions: [
		{
			label: 'Search',
			icon: 'search',
			tooltip: 'Search',
		},
	],
	primaryActionText: 'Apply Filters',
};
