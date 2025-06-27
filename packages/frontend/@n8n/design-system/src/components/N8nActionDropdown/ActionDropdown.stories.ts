import type { StoryFn } from '@storybook/vue3';

import N8nActionDropdown from './ActionDropdown.vue';

export default {
	title: 'Atoms/ActionDropdown',
	component: N8nActionDropdown,
	argTypes: {
		placement: {
			control: {
				type: 'select',
			},
			options: ['top', 'top-end', 'top-start', 'bottom', 'bottom-end', 'bottom-start'],
		},
		activatorIcon: {
			control: {
				type: 'text',
			},
		},
		trigger: {
			control: {
				type: 'select',
			},
			options: ['click', 'hover'],
		},
	},
};

const template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nActionDropdown,
	},
	template: '<n8n-action-dropdown v-bind="args" />',
});

export const defaultActionDropdown = template.bind({});
defaultActionDropdown.args = {
	items: [
		{
			id: 'item1',
			label: 'Action 1',
		},
		{
			id: 'item2',
			label: 'Action 2',
		},
	],
};

export const customStyling = template.bind({});
customStyling.args = {
	activatorIcon: 'menu',
	items: [
		{
			id: 'item1',
			label: 'Action 1',
			icon: 'thumbs-up',
		},
		{
			id: 'item2',
			label: 'Action 2',
			icon: 'thumbs-down',
			disabled: true,
		},
		{
			id: 'item3',
			label: 'Action 3',
			icon: 'home',
			divided: true,
		},
	],
};

export const keyboardShortcuts = template.bind({});
keyboardShortcuts.args = {
	items: [
		{
			id: 'open',
			label: 'Open node...',
			shortcut: { keys: ['↵'] },
		},
		{
			id: 'execute',
			label: 'Execute node',
		},
		{
			id: 'rename',
			label: 'Rename node',
			shortcut: { keys: ['F2'] },
		},
		{
			id: 'toggle_activation',
			label: 'Deactivate node',
			shortcut: { keys: ['D'] },
		},
		{
			id: 'toggle_pin',
			label: 'Pin node',
			shortcut: { keys: ['p'] },
			disabled: true,
		},
		{
			id: 'copy',
			label: 'Copy node',
			shortcut: { metaKey: true, keys: ['C'] },
		},
		{
			id: 'duplicate',
			label: 'Duplicate node',
			shortcut: { metaKey: true, keys: ['D'] },
		},
		{
			id: 'select_all',
			divided: true,
			// always plural
			label: 'Select all nodes',
			shortcut: { metaKey: true, keys: ['A'] },
		},
		{
			id: 'deselect_all',
			label: 'Clear selection',
			disabled: true,
		},
		{
			id: 'delete',
			divided: true,
			label: 'Delete node',
			shortcut: { keys: ['Del'] },
		},
	],
};
