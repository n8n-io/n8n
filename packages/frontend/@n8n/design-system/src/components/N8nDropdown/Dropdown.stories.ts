import type { StoryFn } from '@storybook/vue3-vite';
import { ElMenu } from 'element-plus';
import { action } from 'storybook/actions';
import { ref } from 'vue';

import N8nActionDropdown from '../N8nActionDropdown/ActionDropdown.vue';
import N8nButton from '../N8nButton';
import N8nIconButton from '../N8nIconButton';
import N8nMenuItem from '../N8nMenuItem';
import N8nDropdown from './Dropdown.vue';
import type { N8nDropdownOption } from './Dropdown.vue';
import NavigationDropdown from '../N8nNavigationDropdown/NavigationDropdown.vue';

export default {
	title: 'Core/Dropdown',
	component: N8nDropdown,
	argTypes: {},
	parameters: {
		backgrounds: { default: 'white' },
		docs: {
			description: {
				component: 'A trigger-anchored menu for selecting an option or invoking an action.',
			},
		},
	},
};

export const AddFieldButton: StoryFn = () => ({
	setup: () => {
		const lastAction = ref<string>('');
		const fieldOptions: N8nDropdownOption[] = [
			{ label: 'Name', value: 'name' },
			{ label: 'Email', value: 'email' },
			{ label: 'Phone', value: 'phone' },
			{ label: 'Company', value: 'company' },
			{ label: 'Address', value: 'address' },
			{ label: 'City', value: 'city' },
			{ label: 'Country', value: 'country' },
			{ label: 'Postal Code', value: 'postal_code' },
		];
		const onSelect = (value: string | number) => {
			lastAction.value = `Added field: ${value}`;
		};
		return { lastAction, fieldOptions, onSelect };
	},
	components: {
		N8nDropdown,
		N8nButton,
	},
	template: `
		<div style="padding: var(--spacing--xl);">
			<N8nDropdown
				@select="onSelect"
				:options="fieldOptions"
			>
				<template #trigger>
					<N8nButton type="secondary" icon="plus" label="Add field" />
				</template>
			</N8nDropdown>
			<p v-if="lastAction" style="margin-top: var(--spacing--md); color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
				{{ lastAction }}
			</p>
		</div>
	`,
});

export const ActionsMenu: StoryFn = () => ({
	setup: () => {
		const lastAction = ref<string>('');
		const actionOptions: N8nDropdownOption[] = [
			{ label: 'Edit', value: 'edit' },
			{ label: 'Duplicate', value: 'duplicate' },
			{ label: 'Share', value: 'share' },
			{ label: 'Export', value: 'export' },
			{ label: 'Delete', value: 'delete' },
		];
		const onSelect = (value: string | number) => {
			lastAction.value = String(value);
		};
		return { lastAction, actionOptions, onSelect };
	},
	components: {
		N8nDropdown,
		N8nIconButton,
	},
	template: `
		<div style="padding: var(--spacing--xl);">
			<N8nDropdown @select="onSelect" :options="actionOptions">
				<template #trigger>
					<N8nIconButton type="tertiary" icon="ellipsis-v" />
				</template>
			</N8nDropdown>
			<p v-if="lastAction" style="margin-top: var(--spacing--md); color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
				Last action: <strong>{{ lastAction }}</strong>
			</p>
		</div>
	`,
});

export const CreateNewMenu: StoryFn = () => ({
	setup: () => {
		const lastAction = ref<string>('');
		const createOptions: N8nDropdownOption[] = [
			{ label: 'Workflow', value: 'workflow' },
			{ label: 'Credential', value: 'credential' },
			{ label: 'Project', value: 'project' },
			{ label: 'Template', value: 'template' },
		];
		const onSelect = (value: string | number) => {
			lastAction.value = `Created new ${value}`;
		};
		return { lastAction, createOptions, onSelect };
	},
	components: {
		N8nDropdown,
		N8nButton,
	},
	template: `
		<div style="padding: var(--spacing--xl);">
			<N8nDropdown @select="onSelect" :options="createOptions">
				<template #trigger>
					<N8nButton type="primary" icon="plus" label="Create new" />
				</template>
			</N8nDropdown>
			<p v-if="lastAction" style="margin-top: var(--spacing--md); color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
				{{ lastAction }}
			</p>
		</div>
	`,
});

export const WithDisabledOptions: StoryFn = () => ({
	setup: () => {
		const lastAction = ref<string>('');
		const options: N8nDropdownOption[] = [
			{ label: 'Edit', value: 'edit' },
			{ label: 'Duplicate', value: 'duplicate' },
			{ label: 'Share (unavailable)', value: 'share', disabled: true },
			{ label: 'Export', value: 'export' },
			{ label: 'Delete (unavailable)', value: 'delete', disabled: true },
		];
		const onSelect = (value: string | number) => {
			lastAction.value = String(value);
		};
		return { lastAction, options, onSelect };
	},
	components: {
		N8nDropdown,
		N8nIconButton,
	},
	template: `
		<div style="padding: var(--spacing--xl);">
			<N8nDropdown @select="onSelect" :options="options">
				<template #trigger>
					<N8nIconButton type="tertiary" icon="ellipsis-v" />
				</template>
			</N8nDropdown>
			<p v-if="lastAction" style="margin-top: var(--spacing--md); color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
				Last action: <strong>{{ lastAction }}</strong>
			</p>
		</div>
	`,
});

const menuItems = [
	{
		id: 'credentials',
		title: 'Credentials',
		submenu: [
			{
				id: 'credentials-0',
				title: 'Create',
				disabled: true,
			},
			{
				id: 'credentials-1',
				title: 'Credentials - 1',
				icon: 'user',
			},
			{
				id: 'credentials-2',
				title: 'Credentials - 2',
				icon: 'user',
			},
		],
	},
	{
		id: 'variables',
		title: 'Variables',
	},
];

export const MenuItemPatterns: StoryFn = () => ({
	components: {
		ElMenu,
		N8nMenuItem,
	},
	template: `
		<div style="width: 220px;">
			<el-menu>
				<n8n-menu-item
					:item="{ id: 'workflows', icon: 'home', label: 'Workflows', secondaryIcon: { name: 'lock', size: 'small' } }"
				/>
				<n8n-menu-item
					:item="{ id: 'help', icon: 'question', label: 'Help', children: [{ icon: 'book', label: 'Documentation', id: 'docs' }] }"
				/>
			</el-menu>
		</div>
	`,
});

export const ActionDropdownPatterns: StoryFn = () => ({
	components: {
		N8nActionDropdown: N8nActionDropdown as unknown as Record<string, unknown>,
	},
	template: '<n8n-action-dropdown :items="items" />',
	data() {
		return {
			items: [
				{
					id: 'open',
					label: 'Open node...',
					shortcut: { keys: ['↵'] },
				},
				{
					id: 'rename',
					label: 'Rename node',
					shortcut: { keys: ['F2'] },
				},
				{
					id: 'delete',
					divided: true,
					label: 'Delete node',
					shortcut: { keys: ['Del'] },
				},
			],
		};
	},
});

export const NavigationDropdownPattern: StoryFn = () => ({
	components: {
		NavigationDropdown,
	},
	methods: {
		onSelect: action('select'),
	},
	template: `
		<div style="height: 10vh; width: 220px;">
			<n8n-navigation-dropdown :menu="menuItems" @select="onSelect">
				<button type="button">trigger</button>
			</n8n-navigation-dropdown>
		</div>
	`,
	data() {
		return {
			menuItems,
		};
	},
});
