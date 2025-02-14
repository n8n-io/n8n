import type { StoryFn } from '@storybook/vue3';

import AsyncLoadingDemo from './AsyncLoadingDemo.vue';
import Breadcrumbs from './Breadcrumbs.vue';
import { type PathItem } from './Breadcrumbs.vue';

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
