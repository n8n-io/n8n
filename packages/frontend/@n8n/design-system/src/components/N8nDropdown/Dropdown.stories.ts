import type { StoryFn } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nButton from '../N8nButton';
import N8nDropdown from './Dropdown.vue';
import type { N8nDropdownOption } from './Dropdown.vue';

export default {
	title: 'Atoms/Dropdown',
	component: N8nDropdown,
	argTypes: {
		placeholder: {
			control: 'text',
		},
		disabled: {
			control: 'boolean',
		},
		size: {
			control: 'select',
			options: ['small', 'medium', 'large'],
		},
	},
	parameters: {
		backgrounds: { default: 'white' },
	},
};

const priorityOptions: N8nDropdownOption[] = [
	{ label: 'Low', value: 'low' },
	{ label: 'Medium', value: 'medium' },
	{ label: 'High', value: 'high' },
	{ label: 'Critical', value: 'critical' },
];

const statusOptions: N8nDropdownOption[] = [
	{ label: 'Draft', value: 'draft' },
	{ label: 'In Progress', value: 'in_progress' },
	{ label: 'In Review', value: 'in_review' },
	{ label: 'Approved', value: 'approved' },
	{ label: 'Published', value: 'published' },
];

const countriesOptions: N8nDropdownOption[] = [
	{ label: 'United States', value: 'us' },
	{ label: 'United Kingdom', value: 'uk' },
	{ label: 'Germany', value: 'de' },
	{ label: 'France', value: 'fr' },
	{ label: 'Spain', value: 'es' },
	{ label: 'Italy', value: 'it' },
	{ label: 'Canada', value: 'ca' },
	{ label: 'Australia', value: 'au' },
	{ label: 'Japan', value: 'jp' },
	{ label: 'China', value: 'cn' },
	{ label: 'India', value: 'in' },
	{ label: 'Brazil', value: 'br' },
	{ label: 'Mexico', value: 'mx' },
	{ label: 'Netherlands', value: 'nl' },
	{ label: 'Switzerland', value: 'ch' },
	{ label: 'Sweden', value: 'se' },
	{ label: 'Norway', value: 'no' },
	{ label: 'Denmark', value: 'dk' },
	{ label: 'Finland', value: 'fi' },
	{ label: 'Belgium', value: 'be' },
];

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const selectedValue = ref<string | number>();
		const onSelect = (value: string | number) => {
			selectedValue.value = value;
			console.log('Selected:', value);
		};
		return { args, selectedValue, onSelect };
	},
	props: Object.keys(argTypes),
	components: {
		N8nDropdown,
	},
	template: `
		<div style="padding: 20px;">
			<N8nDropdown v-bind="args" @select="onSelect" />
			<p style="margin-top: 16px; color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
				Selected value: <strong>{{ selectedValue || 'none' }}</strong>
			</p>
		</div>
	`,
});

export const Default = Template.bind({});
Default.args = {
	options: priorityOptions,
	placeholder: 'Select priority',
	disabled: false,
	size: 'medium',
};

export const WithStatusOptions = Template.bind({});
WithStatusOptions.args = {
	options: statusOptions,
	placeholder: 'Select status',
};

export const Disabled = Template.bind({});
Disabled.args = {
	options: statusOptions,
	placeholder: 'Select status',
	disabled: true,
};

export const Sizes: StoryFn = () => ({
	setup: () => {
		const small = ref<string>();
		const medium = ref<string>();
		const large = ref<string>();
		const onSelectSmall = (value: string | number) => {
			small.value = String(value);
		};
		const onSelectMedium = (value: string | number) => {
			medium.value = String(value);
		};
		const onSelectLarge = (value: string | number) => {
			large.value = String(value);
		};
		return { small, medium, large, priorityOptions, onSelectSmall, onSelectMedium, onSelectLarge };
	},
	components: {
		N8nDropdown,
	},
	template: `
		<div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
			<div>
				<label style="display: block; margin-bottom: 8px; font-size: var(--font-size--sm);">Small</label>
				<N8nDropdown @select="onSelectSmall" :options="priorityOptions" placeholder="Select priority" size="small" />
			</div>
			<div>
				<label style="display: block; margin-bottom: 8px; font-size: var(--font-size--sm);">Medium (default)</label>
				<N8nDropdown @select="onSelectMedium" :options="priorityOptions" placeholder="Select priority" size="medium" />
			</div>
			<div>
				<label style="display: block; margin-bottom: 8px; font-size: var(--font-size--sm);">Large</label>
				<N8nDropdown @select="onSelectLarge" :options="priorityOptions" placeholder="Select priority" size="large" />
			</div>
		</div>
	`,
});

export const WithDisabledOptions = Template.bind({});
WithDisabledOptions.args = {
	options: [
		{ label: 'Email', value: 'email' },
		{ label: 'SMS', value: 'sms', disabled: true },
		{ label: 'Push Notification', value: 'push' },
		{ label: 'Webhook', value: 'webhook', disabled: true },
		{ label: 'In-App Message', value: 'in_app' },
	],
	placeholder: 'Select notification method',
};

export const LongList: StoryFn = () => ({
	setup: () => {
		const selectedValue = ref<string>();
		const onSelect = (value: string | number) => {
			selectedValue.value = String(value);
		};
		return { selectedValue, countriesOptions, onSelect };
	},
	components: {
		N8nDropdown,
	},
	template: `
		<div style="padding: 20px;">
			<p style="margin-bottom: 16px; color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
				Long list with scroll and keyboard navigation support
			</p>
			<div style="margin-bottom: 16px; padding: 16px; background-color: var(--color--foreground--tint-2); border-radius: var(--radius); font-size: var(--font-size--sm);">
				<strong>Keyboard Navigation:</strong>
				<ul style="margin: 8px 0 0; padding-left: 20px;">
					<li><kbd>Space</kbd> or <kbd>Enter</kbd> - Open/close dropdown</li>
					<li><kbd>↑</kbd> / <kbd>↓</kbd> - Navigate options</li>
					<li><kbd>Home</kbd> / <kbd>End</kbd> - Jump to first/last option</li>
					<li><kbd>Esc</kbd> - Close dropdown</li>
					<li><kbd>Type</kbd> - Quick search (typeahead)</li>
				</ul>
			</div>

			<N8nDropdown
				@select="onSelect"
				:options="countriesOptions"
				placeholder="Select a country"
			/>

			<p style="margin-top: 16px; color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
				Selected: <strong>{{ selectedValue || 'none' }}</strong>
			</p>
		</div>
	`,
});

export const CustomTrigger: StoryFn = () => ({
	setup: () => {
		const selectedValue = ref<string>();
		const fieldOptions = [
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
			selectedValue.value = String(value);
		};
		return { selectedValue, fieldOptions, onSelect };
	},
	components: {
		N8nDropdown,
		N8nButton,
	},
	template: `
		<div style="padding: 20px;">
			<p style="margin-bottom: 16px; color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
				Used in Fixed Collections - button trigger instead of input
			</p>
			<div style="
				--button--color--background: var(--color--background);
				--button--color--background--hover: var(--color--background);
				--button--color--background--active: var(--color--background);
				--button--color--background--focus: var(--color--background);
				--button--border-color: transparent;
				--button--border-color--hover: transparent;
				--button--border-color--active: transparent;
				--button--border-color--focus: transparent;
				--button--color--text--hover: var(--color--primary);
				--button--color--text--active: var(--color--primary);
				--button--color--text--focus: var(--color--primary);
			">
				<N8nDropdown
					@select="onSelect"
					:options="fieldOptions"
					placeholder="Add field"
					style="display: inline-flex;"
				>
					<template #trigger>
						<N8nButton type="secondary" icon="plus" label="Add field" />
					</template>
				</N8nDropdown>
			</div>
			<p style="margin-top: 16px; color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
				Selected value: <strong>{{ selectedValue || 'none' }}</strong>
			</p>
		</div>
	`,
});
