import type { StoryFn } from '@storybook/vue3';
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
	title: 'Atoms/TableHeaderControlsButton',
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
