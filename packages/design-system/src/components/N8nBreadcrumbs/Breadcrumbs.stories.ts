import type { StoryFn } from '@storybook/vue3';

import type { UserAction } from 'n8n-design-system/types';

import AsyncLoadingDemo from './AsyncLoadingDemo.vue';
import Breadcrumbs from './Breadcrumbs.vue';
import type { PathItem } from './Breadcrumbs.vue';
import ActionToggle from '../N8nActionToggle/ActionToggle.vue';
import Tags from '../N8nTags/Tags.vue';

// TODO: Implement controls
export default {
	title: 'Atoms/Breadcrumbs',
	component: Breadcrumbs,
	argTypes: {},
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

const withHiddenItemsTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { Breadcrumbs },
	props: Object.keys(argTypes),
	template: '<Breadcrumbs v-bind="args" />',
});

export const WithHiddenItems = withHiddenItemsTemplate.bind({});
WithHiddenItems.args = {
	items: items.slice(2),
	hasHiddenItems: true,
	hiddenItemsTooltip: '<a href="#">Parent 1</a><a href="#">Parent 2</a>',
};

const asyncLoadingTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { AsyncLoadingDemo },
	props: Object.keys(argTypes),
	template: '<AsyncLoadingDemo v-bind="args" />',
});

export const AsyncLoading = asyncLoadingTemplate.bind({});
AsyncLoading.args = {
	items: items.slice(2),
};

const testActions: UserAction[] = [
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
        <n8n-icon icon="layer-group"/>
        <n8n-text>My Project</n8n-text>
      </div>
    </template>
    <template #append>
      <div style="display: flex; align-items: center;">
				<n8n-tags :tags="testTags" />
        <n8n-action-toggle size="small" :actions="testActions" />
      </div>
    </template>
  </Breadcrumbs>`,
});
export const WithSlots = withSlotsTemplate.bind({});
WithSlots.args = {
	items: items.slice(2),
	hasHiddenItems: true,
	hiddenItemsTooltip: '<a href="#">Parent 1</a><a href="#">Parent 2</a>',
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
	hasHiddenItems: true,
	hiddenItemsTooltip: '<a href="#">Parent 1</a><a href="#">Parent 2</a>',
};
