import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nActionDropdown from './ActionDropdown.vue';
import type { ActionDropdownItem } from '../../types';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

const meta = {
	title: 'Core/ActionDropdown',
	component: N8nActionDropdown,
	argTypes: {
		placement: {
			control: 'select',
			options: ['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end'],
		},
		activatorIcon: {
			control: 'text',
		},
		activatorSize: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
		},
		trigger: {
			control: 'select',
			options: ['click', 'hover'],
		},
		disabled: {
			control: 'boolean',
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'A compact action menu triggered by an icon button. Use for overflow / kebab menus on list rows and cards.',
			},
			source: { type: 'dynamic' },
		},
	},
} satisfies GenericMeta<typeof N8nActionDropdown<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicItems: Array<ActionDropdownItem<string>> = [
	{ id: 'duplicate', label: 'Duplicate', icon: 'copy' },
	{ id: 'rename', label: 'Rename', icon: 'pencil' },
	{ id: 'delete', label: 'Delete', icon: 'trash-2', divided: true, variant: 'destructive' },
];

export const Default: Story = {
	render: (args) => ({
		components: { N8nActionDropdown },
		setup() {
			return { args, onSelect: action('select') };
		},
		template: `
			<N8nActionDropdown v-bind="args" @select="onSelect" />
		`,
	}),
	args: {
		items: basicItems,
		placement: 'bottom-end',
	},
};

export const WithIconsAndStates: Story = {
	render: (args) => ({
		components: { N8nActionDropdown },
		setup() {
			return { args, onSelect: action('select') };
		},
		template: `
			<N8nActionDropdown v-bind="args" @select="onSelect" />
		`,
	}),
	args: {
		items: [
			{ id: 'open', label: 'Open', icon: 'folder-open' },
			{ id: 'share', label: 'Share', icon: 'share', badge: 'Pro' },
			{
				id: 'archive',
				label: 'Archive',
				icon: 'archive',
				disabled: true,
			},
			{ id: 'delete', label: 'Delete', icon: 'trash-2', divided: true, variant: 'destructive' },
		] as Array<ActionDropdownItem<string>>,
		placement: 'bottom-end',
	},
};

export const WithShortcuts: Story = {
	render: (args) => ({
		components: { N8nActionDropdown },
		setup() {
			return { args, onSelect: action('select') };
		},
		template: `
			<N8nActionDropdown v-bind="args" @select="onSelect" />
		`,
	}),
	args: {
		items: [
			{ id: 'copy', label: 'Copy', icon: 'copy', shortcut: { keys: ['C'], metaKey: true } },
			{ id: 'paste', label: 'Paste', icon: 'clipboard', shortcut: { keys: ['V'], metaKey: true } },
			{
				id: 'delete',
				label: 'Delete',
				icon: 'trash-2',
				divided: true,
				variant: 'destructive',
				shortcut: { keys: ['Backspace'] },
			},
		] as Array<ActionDropdownItem<string>>,
		placement: 'bottom-end',
	},
};

export const Disabled: Story = {
	render: (args) => ({
		components: { N8nActionDropdown },
		setup() {
			return { args };
		},
		template: `
			<N8nActionDropdown v-bind="args" />
		`,
	}),
	args: {
		items: basicItems,
		disabled: true,
	},
};
