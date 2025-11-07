import type { StoryFn } from '@storybook/vue3-vite';
import { ref } from 'vue';

import TableHeaderControlsButton from './TableHeaderControlsButton.vue';

interface ColumnHeader {
	key: string;
	label: string;
	visible: boolean;
}

interface StoryArgs {
	columns: ColumnHeader[];
}

export default {
	title: 'Modules/TableHeaderControlsButton',
	component: TableHeaderControlsButton,
};

const Template: StoryFn<StoryArgs> = (args) => ({
	setup: () => {
		const columns = ref<ColumnHeader[]>([...args.columns]);

		const handleColumnVisibilityUpdate = (key: string, visibility: boolean) => {
			const column = columns.value.find((col: ColumnHeader) => col.key === key);
			if (column) {
				column.visible = visibility;
			}
		};

		const handleColumnOrderUpdate = (newOrder: string[]) => {
			const reorderedColumns = newOrder.map(
				(key: string) => columns.value.find((col: ColumnHeader) => col.key === key)!,
			);
			const hiddenColumns = columns.value.filter((col: ColumnHeader) => !col.visible);
			columns.value = [...reorderedColumns, ...hiddenColumns];
		};

		return {
			columns,
			handleColumnVisibilityUpdate,
			handleColumnOrderUpdate,
		};
	},
	components: {
		TableHeaderControlsButton,
	},
	template: `
		<table-header-controls-button
			:columns="columns"
			@update:columnVisibility="handleColumnVisibilityUpdate"
			@update:columnOrder="handleColumnOrderUpdate"
		/>
	`,
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

export const ALotOfColumnsShown = Template.bind({});
ALotOfColumnsShown.args = {
	columns: [
		{ key: 'name', label: 'Name', visible: true },
		{ key: 'email', label: 'Email', visible: true },
		{ key: 'role', label: 'Role', visible: true },
		{ key: 'status', label: 'Status', visible: false },
		{ key: 'created', label: 'Created', visible: true },
		{ key: 'department', label: 'Department', visible: true },
		{ key: 'manager', label: 'Manager', visible: false },
		{ key: 'location', label: 'Location', visible: true },
		{ key: 'phone', label: 'Phone', visible: false },
		{ key: 'salary', label: 'Salary', visible: false },
		{ key: 'startDate', label: 'Start Date', visible: true },
		{ key: 'endDate', label: 'End Date', visible: false },
		{ key: 'projects', label: 'Projects', visible: true },
		{ key: 'skills', label: 'Skills', visible: false },
		{ key: 'experience', label: 'Experience', visible: true },
		{ key: 'education', label: 'Education', visible: false },
		{ key: 'certifications', label: 'Certifications', visible: false },
		{ key: 'languages', label: 'Languages', visible: false },
		{ key: 'notes', label: 'Notes', visible: false },
		{ key: 'lastLogin', label: 'Last Login', visible: true },
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
