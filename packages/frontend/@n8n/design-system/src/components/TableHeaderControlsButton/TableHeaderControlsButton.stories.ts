import type { StoryFn } from '@storybook/vue3';

import TableHeaderControlsButton from './TableHeaderControlsButton.vue';

export default {
	title: 'Atoms/TableHeaderControlsButton',
	component: TableHeaderControlsButton,
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	props: args,
	components: {
		TableHeaderControlsButton,
	},
	template: '<table-header-controls-button v-bind="args" />',
});

export const AllColumnsShown = Template.bind({});
AllColumnsShown.args = {
	columns: [
		{ key: 'name', label: 'Name', visible: true },
		{ key: 'email', label: 'Email', visible: true },
		{ key: 'role', label: 'Role', visible: true },
		{ key: 'status', label: 'Status', visible: true },
		{ key: 'created', label: 'Created', visible: true },
	],
};

export const SomeColumnsHidden = Template.bind({});
SomeColumnsHidden.args = {
	columns: [
		{ key: 'name', label: 'Name', visible: true },
		{ key: 'email', label: 'Email', visible: false },
		{ key: 'role', label: 'Role', visible: true },
		{ key: 'status', label: 'Status', visible: false },
		{ key: 'created', label: 'Created', visible: true },
	],
};

export const MinimalColumns = Template.bind({});
MinimalColumns.args = {
	columns: [
		{ key: 'name', label: 'Name', visible: true },
		{ key: 'email', label: 'Email', visible: false },
	],
};
