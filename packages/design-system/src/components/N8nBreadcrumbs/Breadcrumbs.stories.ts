import type { StoryFn } from '@storybook/vue3';

import type { UserAction } from 'n8n-design-system/types';

import AsyncLoadingDemo from './AsyncLoadingDemo.vue';
import Breadcrumbs from './Breadcrumbs.vue';
import type { PathItem } from './Breadcrumbs.vue';
import ActionToggle from '../N8nActionToggle/ActionToggle.vue';

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
const withSlotsTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args, testActions }),
	components: { Breadcrumbs, ActionToggle },
	props: Object.keys(argTypes),
	template: `<Breadcrumbs v-bind="args">
    <template #prepend>
      <div style="display: flex; align-items: center; gap: 4px;">
        <n8n-icon icon="layer-group"/>
        <n8n-text>My Project</n8n-text>
      </div>
    </template>
    <template #append>
      <div style="display: flex; align-items: center;">
        <action-toggle size="small" :actions="testActions" />
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
