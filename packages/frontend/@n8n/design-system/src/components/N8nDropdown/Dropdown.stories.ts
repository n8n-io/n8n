import type { StoryFn } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nButton from '../N8nButton';
import N8nIconButton from '../N8nIconButton';
import N8nDropdown from './Dropdown.vue';
import type { N8nDropdownOption } from './Dropdown.vue';

export default {
	title: 'Atoms/Dropdown',
	component: N8nDropdown,
	argTypes: {},
	parameters: {
		backgrounds: { default: 'white' },
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
