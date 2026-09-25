import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nSelectedItemsInfo from './SelectedItemsInfo.vue';
import N8nButton from '../N8nButton';

const meta = {
	title: 'Core/SelectedItemsInfo',
	component: N8nSelectedItemsInfo,
	argTypes: {
		selectedCount: { control: 'number' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'Floating bar that shows how many list rows are selected, with bulk actions and a clear-selection button. It is positioned absolutely at the bottom of its closest positioned ancestor.',
			},
		},
	},
} satisfies Meta<typeof N8nSelectedItemsInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

const methods = {
	onDeleteSelected: action('deleteSelected'),
	onClearSelection: action('clearSelection'),
};

export const Default: Story = {
	render: (args) => ({
		components: { N8nSelectedItemsInfo },
		setup() {
			return { args, ...methods };
		},
		template: `
			<div style="position: relative; height: 200px;">
				<N8nSelectedItemsInfo
					v-bind="args"
					@delete-selected="onDeleteSelected"
					@clear-selection="onClearSelection"
				/>
			</div>
		`,
	}),
	args: {
		selectedCount: 3,
	},
};

export const CustomActions: Story = {
	render: (args) => ({
		components: { N8nSelectedItemsInfo, N8nButton },
		setup() {
			return { args, ...methods };
		},
		template: `
			<div style="position: relative; height: 200px;">
				<N8nSelectedItemsInfo v-bind="args" @clear-selection="onClearSelection">
					<template #actions>
						<N8nButton variant="subtle" label="Archive" />
						<N8nButton variant="subtle" label="Export" />
					</template>
				</N8nSelectedItemsInfo>
			</div>
		`,
	}),
	args: {
		selectedCount: 1,
	},
};
