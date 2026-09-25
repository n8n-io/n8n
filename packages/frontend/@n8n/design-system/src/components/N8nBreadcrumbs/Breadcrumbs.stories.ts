import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import AsyncLoadingCacheDemo from './AsyncLoadingCacheDemo.vue';
import Breadcrumbs from './Breadcrumbs.vue';
import type { PathItem } from './Breadcrumbs.vue';
import type { IUser, UserAction } from '../../types';
import ActionToggle from '../N8nActionToggle/ActionToggle.vue';
import Tags from '../N8nTags/Tags.vue';

export default {
	title: 'Core/Breadcrumbs',
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

	parameters: {
		docs: {
			description: {
				component:
					'A hierarchical navigation trail showing the current location and parent levels.',
			},
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

const playgroundItemCounts = [2, 3, 4, 5, 6] as const;
type PlaygroundItemCount = (typeof playgroundItemCounts)[number];

const playgroundItemsByCount: Record<PlaygroundItemCount, PathItem[]> = {
	2: [
		{ id: '1', label: 'Item 1', href: '/item-1' },
		{ id: '2', label: 'Item 2' },
	],
	3: [
		{ id: '1', label: 'Item 1', href: '/item-1' },
		{ id: '2', label: 'Item 2', href: '/item-2' },
		{ id: '3', label: 'Item 3' },
	],
	4: [
		{ id: '1', label: 'Item 1', href: '/item-1' },
		{ id: '2', label: 'Item 2', href: '/item-2' },
		{ id: '3', label: 'Item 3', href: '/item-3' },
		{ id: '4', label: 'Item 4' },
	],
	5: [
		{ id: '1', label: 'Item 1', href: '/item-1' },
		{ id: '2', label: 'Item 2', href: '/item-2' },
		{ id: '3', label: 'Item 3', href: '/item-3' },
		{ id: '4', label: 'Item 4', href: '/item-4' },
		{ id: '5', label: 'Item 5' },
	],
	6: [
		{ id: '1', label: 'Item 1', href: '/item-1' },
		{ id: '2', label: 'Item 2', href: '/item-2' },
		{ id: '3', label: 'Item 3', href: '/item-3' },
		{ id: '4', label: 'Item 4', href: '/item-4' },
		{ id: '5', label: 'Item 5', href: '/item-5' },
		{ id: '6', label: 'Item 6' },
	],
};

type PlaygroundArgs = {
	itemCount: PlaygroundItemCount;
	theme: 'small' | 'medium';
	showBorder: boolean;
};

export const Playground: StoryFn<PlaygroundArgs> = (args) => ({
	components: { Breadcrumbs },
	setup() {
		return {
			args,
			playgroundItemsByCount,
			onItemSelected: action('itemSelected'),
		};
	},
	template: `
		<Breadcrumbs
			:items="playgroundItemsByCount[args.itemCount]"
			:theme="args.theme"
			:show-border="args.showBorder"
			@item-selected="onItemSelected"
		/>
	`,
});
Playground.args = {
	itemCount: 3,
	theme: 'medium',
	showBorder: false,
};
Playground.argTypes = {
	itemCount: {
		control: 'radio',
		options: [...playgroundItemCounts],
		description: 'Number of breadcrumb items. Map to the Figma "number of items" property.',
	},
	items: { table: { disable: true } },
	hiddenItemsSource: { table: { disable: true } },
};

export const Sizes: StoryFn = () => ({
	components: { Breadcrumbs },
	setup() {
		return { items };
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 16px;">
			<Breadcrumbs :items="items" theme="medium" />
			<Breadcrumbs :items="items" theme="small" />
		</div>
	`,
});

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
