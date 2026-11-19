import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { ref } from 'vue';

import N8nTabs from './Tabs.vue';
import type { TabOptions } from '../../types/tabs';

export default {
	title: 'Core/Tabs',
	component: N8nTabs,
	argTypes: {
		variant: {
			control: 'select',
			options: ['underline', 'filled'],
		},
		size: {
			control: 'select',
			options: ['small', 'medium', 'large'],
		},
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
		},
		justified: {
			control: 'boolean',
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A tab navigation component for switching between content panels.',
			},
		},
		backgrounds: { default: '--color--background--light-3' },
	},
};

type DefaultTab = 'overview' | 'usage' | 'accessibility';

const defaultTabs: Array<TabOptions<DefaultTab>> = [
	{ label: 'Overview', value: 'overview' },
	{ label: 'Usage', value: 'usage' },
	{ label: 'Accessibility', value: 'accessibility' },
];

export const Default: StoryFn = (args) => ({
	components: { N8nTabs },
	setup() {
		const val = ref<DefaultTab>('overview');
		return { args, val, options: defaultTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs
			v-model="val"
			:options="options"
			:variant="args.variant"
			:size="args.size"
			:orientation="args.orientation"
			:justified="args.justified"
			@update:model-value="onUpdateModelValue"
		>
			<template #content="{ value }">
				<p v-if="value === 'overview'" style="padding: var(--spacing--sm);">
					Tabs let users switch between related views without leaving the page.
					Each tab shows one view at a time.
				</p>
				<p v-else-if="value === 'usage'" style="padding: var(--spacing--sm);">
					Use tabs for content at the same level of hierarchy.
					Keep labels short, and do not use more tabs than fit in one row.
				</p>
				<p v-else style="padding: var(--spacing--sm);">
					Use the arrow keys to move between tabs.
					Press Enter or Space to select the focused tab.
				</p>
			</template>
		</n8n-tabs>
	`,
});
Default.args = {
	variant: 'underline',
	size: 'medium',
	orientation: 'horizontal',
	justified: false,
};

const sharedArgs = {
	variant: 'underline',
	size: 'medium',
	orientation: 'horizontal',
	justified: false,
};

const overflowTabs: Array<TabOptions<string>> = [
	'Overview',
	'Executions',
	'Settings',
	'Credentials',
	'Variables',
	'Templates',
	'Members',
	'Billing',
	'Usage',
	'Security',
	'Logs',
	'Integrations',
	'Notifications',
	'Advanced',
].map((label) => ({ label, value: label.toLowerCase() }));

export const Overflow: StoryFn = (args) => ({
	components: { N8nTabs },
	setup() {
		const val = ref('overview');
		return { args, val, options: overflowTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<div style="max-width: 480px;">
			<n8n-tabs
				v-model="val"
				:options="options"
				:variant="args.variant"
				:size="args.size"
				:orientation="args.orientation"
				:justified="args.justified"
				@update:model-value="onUpdateModelValue"
			>
				<template #content="{ value }">
					<p style="padding: var(--spacing--sm);">
						This is the {{ options.find((option) => option.value === value)?.label }} tab.
						The tab row is wider than its container, so use the arrow buttons to scroll.
					</p>
				</template>
			</n8n-tabs>
		</div>
	`,
});
Overflow.args = { ...sharedArgs };

type IconTab = 'home' | 'members' | 'settings';

const iconTabs: Array<TabOptions<IconTab>> = [
	{ label: 'Home', value: 'home', icon: 'house' },
	{ label: 'Members', value: 'members', icon: 'users', notification: true },
	{ label: 'Settings', value: 'settings', icon: 'settings' },
];

export const Icons: StoryFn = (args) => ({
	components: { N8nTabs },
	setup() {
		const val = ref<IconTab>('home');
		return { args, val, options: iconTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs
			v-model="val"
			:options="options"
			:variant="args.variant"
			:size="args.size"
			:orientation="args.orientation"
			:justified="args.justified"
			@update:model-value="onUpdateModelValue"
		>
			<template #content="{ value }">
				<p v-if="value === 'home'" style="padding: var(--spacing--sm);">
					See a summary of recent activity in the project.
				</p>
				<p v-else-if="value === 'members'" style="padding: var(--spacing--sm);">
					Add or remove the users who have access to the project.
				</p>
				<p v-else style="padding: var(--spacing--sm);">
					Change the settings of the project.
				</p>
			</template>
		</n8n-tabs>
	`,
});
Icons.args = { ...sharedArgs };

export const Justified: StoryFn = (args) => ({
	components: { N8nTabs },
	setup() {
		const val = ref<DefaultTab>('overview');
		return { args, val, options: defaultTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs
			v-model="val"
			:options="options"
			:variant="args.variant"
			:size="args.size"
			:orientation="args.orientation"
			:justified="args.justified"
			@update:model-value="onUpdateModelValue"
		>
			<template #content="{ value }">
				<p v-if="value === 'overview'" style="padding: var(--spacing--sm);">
					Justified tabs fill the full width of the container.
					Each tab gets the same width.
				</p>
				<p v-else-if="value === 'usage'" style="padding: var(--spacing--sm);">
					Use justified tabs when there are few tabs and the container is narrow.
				</p>
				<p v-else style="padding: var(--spacing--sm);">
					Use the arrow keys to move between tabs.
					Press Enter or Space to select the focused tab.
				</p>
			</template>
		</n8n-tabs>
	`,
});
Justified.args = { ...sharedArgs, justified: true };

export const Vertical: StoryFn = (args) => ({
	components: { N8nTabs },
	setup() {
		const val = ref<DefaultTab>('overview');
		return { args, val, options: defaultTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs
			v-model="val"
			:options="options"
			:variant="args.variant"
			:size="args.size"
			:orientation="args.orientation"
			:justified="args.justified"
			@update:model-value="onUpdateModelValue"
		>
			<template #content="{ value }">
				<p v-if="value === 'overview'" style="padding: var(--spacing--sm);">
					Vertical tabs show the tab list in a column next to the content.
				</p>
				<p v-else-if="value === 'usage'" style="padding: var(--spacing--sm);">
					Use vertical tabs for settings pages or when there are many tabs.
				</p>
				<p v-else style="padding: var(--spacing--sm);">
					Use the Up and Down arrow keys to move between tabs.
					Press Enter or Space to select the focused tab.
				</p>
			</template>
		</n8n-tabs>
	`,
});
Vertical.args = { ...sharedArgs, orientation: 'vertical' };
