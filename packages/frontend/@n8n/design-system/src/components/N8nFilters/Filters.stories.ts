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

export const WithDateFilter = Template.bind({});
WithDateFilter.args = {
	filters: [
		{
			label: 'Created Date',
			type: 'date',
			options: [], // Date filters don't use options
			minValue: '2020-01-01',
			maxValue: '2030-12-31',
		},
		{
			label: 'Due Date',
			type: 'date',
			options: [],
		},
		{
			label: 'Status',
			type: 'single',
			options: [
				{ name: 'Active', id: 'active', value: 'active' },
				{ name: 'Completed', id: 'completed', value: 'completed' },
				{ name: 'Overdue', id: 'overdue', value: 'overdue' },
			],
		},
	],
	actions: [
		{
			label: 'Filter',
			icon: 'list-filter',
			tooltip: 'Apply date filters',
		},
	],
	primaryActionText: 'Search',
};

export const WithStringFilter = Template.bind({});
WithStringFilter.args = {
	filters: [
		{
			label: 'Name',
			type: 'string',
			options: [], // String filters don't use predefined options
		},
		{
			label: 'Description',
			type: 'string',
			options: [],
		},
		{
			label: 'Status',
			type: 'single',
			options: [
				{ name: 'Active', id: 'active', value: 'active' },
				{ name: 'Inactive', id: 'inactive', value: 'inactive' },
			],
		},
	],
	actions: [
		{
			label: 'Search',
			icon: 'search',
			tooltip: 'Search by text',
		},
	],
	primaryActionText: 'Apply Filters',
};

export const WithAllFilterTypes = Template.bind({});
WithAllFilterTypes.args = {
	filters: [
		{
			label: 'Name',
			type: 'string',
			options: [],
		},
		{
			label: 'Status',
			type: 'single',
			options: [
				{ name: 'Draft', id: 'draft', value: 'draft' },
				{ name: 'Published', id: 'published', value: 'published' },
				{ name: 'Archived', id: 'archived', value: 'archived' },
			],
		},
		{
			label: 'Tags',
			type: 'multi',
			options: [
				{ name: 'Important', id: 'important', value: 'important' },
				{ name: 'Featured', id: 'featured', value: 'featured' },
				{ name: 'Trending', id: 'trending', value: 'trending' },
				{ name: 'New', id: 'new', value: 'new' },
			],
		},
		{
			label: 'Created Date',
			type: 'date',
			options: [],
			minValue: '2023-01-01',
		},
		{
			label: 'Modified Date',
			type: 'date',
			options: [],
			maxValue: '2024-12-31',
		},
	],
	actions: [
		{
			label: 'Search',
			icon: 'search',
			tooltip: 'Search items',
		},
		{
			label: 'Export',
			icon: 'download',
			tooltip: 'Export filtered results',
		},
	],
	primaryActionText: 'Create New',
};
