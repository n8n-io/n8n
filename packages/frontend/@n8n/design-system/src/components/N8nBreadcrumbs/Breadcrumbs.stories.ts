import type { StoryFn } from '@storybook/vue3-vite';

import type { IUser, UserAction } from '@n8n/design-system/types';

import AsyncLoadingCacheDemo from './AsyncLoadingCacheDemo.vue';
import Breadcrumbs from './Breadcrumbs.vue';
import type { PathItem } from './Breadcrumbs.vue';
import ActionToggle from '../N8nActionToggle/ActionToggle.vue';
import Tags from '../N8nTags/Tags.vue';

export default {
	title: 'Atoms/Breadcrumbs',
	component: Breadcrumbs,
	argTypes: {
		items: { control: 'object' },
		hiddenItemsSource: { control: 'object' },
		theme: {
			control: {
				type: 'select',
			},
			options: ['medium', 'small'],
		},
		showBorder: { control: 'boolean' },
		tooltipTrigger: {
			control: {
				type: 'select',
			},
			options: ['hover', 'click'],
		},
	},
};

const items: PathItem[] = [
	{ id: '1', label: 'Folder 1', href: '/folder1' },
	{ id: '2', label: 'Folder 2', href: '/folder2' },
	{ id: '3', label: 'Folder 3', href: '/folder3' },
	{ id: '4', label: 'Current' },
];

const defaultTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { Breadcrumbs },
	props: Object.keys(argTypes),
	template: '<Breadcrumbs v-bind="args" />',
});

export const Default = defaultTemplate.bind({});
Default.args = {
	items,
};

export const CustomSeparator = defaultTemplate.bind({});
CustomSeparator.args = {
	items,
	separator: '➮',
};

const withHiddenItemsTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { Breadcrumbs },
	props: Object.keys(argTypes),
	template: '<Breadcrumbs v-bind="args" />',
});

export const WithHiddenItems = withHiddenItemsTemplate.bind({});
WithHiddenItems.args = {
	items: items.slice(2),
	hiddenItems: [
		{ id: '3', label: 'Parent 1', href: '/hidden1' },
		{ id: '4', label: 'Parent 2', href: '/hidden2' },
	],
};

const hiddenItemsDisabledTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { Breadcrumbs },
	props: Object.keys(argTypes),
	template: '<Breadcrumbs v-bind="args" />',
});

export const HiddenItemsDisabled = hiddenItemsDisabledTemplate.bind({});
HiddenItemsDisabled.args = {
	items: items.slice(2),
	pathTruncated: true,
};

const asyncLoadingTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { AsyncLoadingCacheDemo },
	props: Object.keys(argTypes),
	template: '<AsyncLoadingCacheDemo v-bind="args" />',
});

export const AsyncLoading = asyncLoadingTemplate.bind({});
AsyncLoading.args = {
	mode: 'async',
	title: '[Demo] Async loading with cached items',
};

const asyncLoadingNoCacheTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { AsyncLoadingCacheDemo },
	props: Object.keys(argTypes),
	template: '<AsyncLoadingCacheDemo v-bind="args" />',
});

export const AsyncLoadingCacheTest = asyncLoadingNoCacheTemplate.bind({});
AsyncLoadingCacheTest.args = {
	mode: 'async',
	testCache: true,
	title: '[Demo] This will bust the cache after hidden items are loaded 2 times',
};

const syncLoadingNoCacheTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { AsyncLoadingCacheDemo },
	props: Object.keys(argTypes),
	template: '<AsyncLoadingCacheDemo v-bind="args" />',
});

export const SyncLoadingCacheTest = syncLoadingNoCacheTemplate.bind({});
SyncLoadingCacheTest.args = {
	mode: 'sync',
	testCache: true,
	title: '[Demo] This will update the hidden items every time dropdown is opened',
};

const testActions: Array<UserAction<IUser>> = [
	{ label: 'Create Folder', value: 'action1', disabled: false },
	{ label: 'Create Workflow', value: 'action2', disabled: false },
	{ label: 'Rename', value: 'action3', disabled: false },
];
const testTags: Array<{ id: string; name: string }> = [
	{ id: '1', name: 'tag1' },
	{ id: '2', name: 'tag2' },
];
const withSlotsTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args, testActions, testTags }),
	components: { Breadcrumbs, ActionToggle, Tags },
	props: Object.keys(argTypes),
	template: `<Breadcrumbs v-bind="args">
    <template #prepend>
      <div style="display: flex; align-items: center; gap: 8px;">
        <n8n-icon icon="layers"/>
        <n8n-text>My Project</n8n-text>
      </div>
    </template>
    <template #append>
      <div style="display: flex; align-items: center;">
				<n8n-tags :tags="testTags" />
        <n8n-action-toggle size="small" :actions="testActions" theme="dark"/>
      </div>
    </template>
  </Breadcrumbs>`,
});
export const WithSlots = withSlotsTemplate.bind({});
WithSlots.args = {
	items: items.slice(2),
	hiddenItems: [
		{ id: '3', label: 'Parent 1', href: '/hidden1' },
		{ id: '4', label: 'Parent 2', href: '/hidden2' },
	],
};

const smallVersionTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { Breadcrumbs },
	props: Object.keys(argTypes),
	template: '<Breadcrumbs v-bind="args" />',
});
export const SmallVersion = smallVersionTemplate.bind({});
SmallVersion.args = {
	items,
	theme: 'small',
	showBorder: true,
};

const smallWithSlotsTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { Breadcrumbs },
	props: Object.keys(argTypes),
	template: `<Breadcrumbs v-bind="args">
	<template #prepend>
		<div style="display: flex; align-items: center; gap: 4px; font-size: 10px">
			<n8n-icon icon="user"/>
			<n8n-text>Personal</n8n-text>
		</div>
	</template>
</Breadcrumbs>`,
});
export const SmallWithSlots = smallWithSlotsTemplate.bind({});
SmallWithSlots.args = {
	theme: 'small',
	showBorder: true,
	items: items.slice(2),
	hiddenItems: [
		{ id: '3', label: 'Parent 1', href: '/hidden1' },
		{ id: '4', label: 'Parent 2', href: '/hidden2' },
	],
};

const smallAsyncLoadingTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { AsyncLoadingCacheDemo },
	props: Object.keys(argTypes),
	template: '<AsyncLoadingCacheDemo v-bind="args" />',
});

export const SmallAsyncLoading = smallAsyncLoadingTemplate.bind({});
SmallAsyncLoading.args = {
	mode: 'async',
	title: '[Demo] Small version with async loading',
	theme: 'small',
	showBorder: true,
};

const smallHiddenItemsDisabledTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { Breadcrumbs },
	props: Object.keys(argTypes),
	template: '<Breadcrumbs v-bind="args" />',
});

export const SmallWithHiddenItemsDisabled = smallHiddenItemsDisabledTemplate.bind({});
SmallWithHiddenItemsDisabled.args = {
	theme: 'small',
	showBorder: true,
	items: items.slice(2),
	pathTruncated: true,
};
