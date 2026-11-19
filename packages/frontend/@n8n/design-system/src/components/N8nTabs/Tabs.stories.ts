import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nTabs from './Tabs.vue';
import type { TabOptions } from '../../types/tabs';

export default {
	title: 'Core/Tabs',
	component: N8nTabs,
	argTypes: {},
	parameters: {
		docs: {
			description: {
				component: 'A tab navigation component for switching between content panels.',
			},
		},
		backgrounds: { default: '--color--background--light-3' },
	},
};

const methods = {
	onUpdateModelValue: action('update:modelValue'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nTabs,
	},
	template: `<n8n-tabs v-model="val" v-bind="args" @update:modelValue="onUpdateModelValue">
		</n8n-tabs>`,
	methods,
	data() {
		return {
			val: '',
		};
	},
});

type DefaultTab = 'overview' | 'usage' | 'accessibility';

const defaultTabs: Array<TabOptions<DefaultTab>> = [
	{ label: 'Overview', value: 'overview' },
	{ label: 'Usage', value: 'usage' },
	{ label: 'Accessibility', value: 'accessibility' },
];

export const Default: StoryFn = () => ({
	components: { N8nTabs },
	setup() {
		return { options: defaultTabs };
	},
	data() {
		return { val: 'overview' };
	},
	methods,
	template: `
		<n8n-tabs v-model="val" :options="options" @update:model-value="onUpdateModelValue">
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

const options: Array<TabOptions<string>> = [
	{
		label: 'First',
		value: 'first',
	},
	{
		label: 'Second',
		value: 'second',
	},
	{
		label: 'External Link',
		value: 'external',
		href: 'https://github.com/',
	},
	{
		label: 'Danger',
		value: 'danger',
		isDestructive: true,
		icon: 'triangle-alert',
	},
	{
		label: 'Right Icon',
		value: 'rightIcon',
		icon: 'circle',
		iconPosition: 'right',
	},
	{
		label: '',
		value: 'iconOnly',
		tooltip: 'Icon only tab',
		icon: 'circle',
	},
	{
		label: 'Notification',
		value: 'notification',
		notification: true,
	},
	{
		label: 'Count',
		value: 'count',
		tag: '2',
	},
	{
		label: 'Settings',
		value: 'settings',
		icon: 'cog',
		align: 'right',
	},
];

export const Variants = Template.bind({});
Variants.args = {
	modelValue: 'first',
	options,
};

export const Overflow: StoryFn = () => ({
	components: { N8nTabs },
	data() {
		return { val: 'first', options };
	},
	template: `
		<div style="width: 40%; min-width: var(--spacing--xl); display: flex; flex-direction: column; gap: var(--spacing--xl);">
			<n8n-tabs v-model="val" :options="options" />
			<n8n-tabs v-model="val" size="small" :options="options" />
			<n8n-tabs v-model="val" :options="options" />
			<n8n-tabs v-model="val" size="small" :options="options" />
		</div>
	`,
});

export const OversizedTab: StoryFn = () => ({
	components: { N8nTabs },
	data() {
		return {
			val: 'wide',
			options: [
				{
					value: 'wide',
					label:
						'A very long tab label that is wider than its container and needs several scroll steps to read',
					tag: '2',
				},
			],
		};
	},
	template: `
		<div style="width: 40%;">
			<n8n-tabs v-model="val" :options="options" />
		</div>
	`,
});

export const Justified: StoryFn = () => ({
	components: { N8nTabs },
	data() {
		return {
			val: 'first',
			options: [
				{ value: 'first', label: 'A long first tab label', notification: true },
				{ value: 'second', label: 'Second tab' },
				{ value: 'third', label: 'A long third tab label' },
			],
		};
	},
	template: `
		<div style="width: 40%;">
			<n8n-tabs v-model="val" justified :options="options" />
		</div>
	`,
});

export const Sizes: StoryFn = () => ({
	components: { N8nTabs },
	data() {
		return {
			val: 'first',
			options,
		};
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 24px;">
			<n8n-tabs v-model="val" size="medium" :options="options" />
			<n8n-tabs v-model="val" size="small" :options="options" />
			<n8n-tabs v-model="val" size="medium" :options="options" />
			<n8n-tabs v-model="val" size="small" :options="options" />
		</div>
	`,
});
