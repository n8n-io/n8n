import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nHeaderAction from './HeaderAction.vue';

const meta = {
	title: 'Core/HeaderAction',
	component: N8nHeaderAction,
	argTypes: {
		icon: { control: 'text' },
		label: { control: 'text' },
		tooltip: { control: 'text' },
		danger: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'A compact icon action for panel and section headers. Wraps `N8nIconButton` with an optional tooltip; use `danger` for destructive actions.',
			},
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof N8nHeaderAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nHeaderAction },
		setup() {
			return { args, onClick: action('click') };
		},
		template: '<N8nHeaderAction v-bind="args" @click="onClick" />',
	}),
	args: {
		icon: 'plus',
		label: 'Add item',
		tooltip: 'Add item',
	},
};

export const Danger: Story = {
	render: (args) => ({
		components: { N8nHeaderAction },
		setup() {
			return { args, onClick: action('click') };
		},
		template: '<N8nHeaderAction v-bind="args" @click="onClick" />',
	}),
	args: {
		icon: 'trash-2',
		label: 'Delete',
		tooltip: 'Delete',
		danger: true,
	},
};

export const WithoutTooltip: Story = {
	render: (args) => ({
		components: { N8nHeaderAction },
		setup() {
			return { args, onClick: action('click') };
		},
		template: '<N8nHeaderAction v-bind="args" @click="onClick" />',
	}),
	args: {
		icon: 'grip-vertical',
		label: 'Drag to reorder',
	},
};

export const Group: Story = {
	render: () => ({
		components: { N8nHeaderAction },
		setup() {
			return { onClick: action('click') };
		},
		template: `
			<div style="display: flex; gap: var(--spacing--4xs); align-items: center;">
				<N8nHeaderAction icon="plus" label="Add" tooltip="Add" @click="onClick" />
				<N8nHeaderAction icon="grip-vertical" label="Reorder" tooltip="Drag to reorder" @click="onClick" />
				<N8nHeaderAction icon="trash-2" label="Delete" tooltip="Delete" danger @click="onClick" />
			</div>
		`,
	}),
	args: {
		icon: 'plus',
		label: 'Add',
	},
};
