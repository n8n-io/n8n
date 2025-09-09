import type { StoryFn } from '@storybook/vue3';

import StringFilter from './StringFilter.vue';

export default {
	title: 'Atoms/N8nFilters/StringFilter',
	component: StringFilter,
	argTypes: {
		placeholder: {
			control: { type: 'text' },
			description: 'Placeholder text for the input field',
		},
		conditions: {
			control: { type: 'object' },
			description: 'Available filter conditions',
		},
	},
};

const Template: StoryFn = (args) => ({
	components: {
		StringFilter,
	},
	setup() {
		return { args };
	},
	template: '<StringFilter v-bind="args" @update:model-value="onUpdate" />',
	methods: {
		onUpdate(value: unknown) {
			console.log('StringFilter value changed:', value);
		},
	},
});

export const Default = Template.bind({});
Default.args = {
	placeholder: 'Enter text...',
};

export const WithCustomPlaceholder = Template.bind({});
WithCustomPlaceholder.args = {
	placeholder: 'Search by name...',
};

export const WithCustomConditions = Template.bind({});
WithCustomConditions.args = {
	placeholder: 'Enter search term...',
	conditions: [
		{ id: 'contains', label: 'Contains' },
		{ id: 'exact', label: 'Exact match' },
		{ id: 'starts_with', label: 'Starts with' },
		{ id: 'ends_with', label: 'Ends with' },
		{ id: 'regex', label: 'Regular expression' },
	],
};

export const PrefilledValue = Template.bind({});
PrefilledValue.args = {
	placeholder: 'Enter text...',
	initialValue: {
		id: 'contains:test',
		name: 'test',
		value: 'test',
		condition: {
			id: 'contains',
			label: 'Contains',
		},
	},
};
