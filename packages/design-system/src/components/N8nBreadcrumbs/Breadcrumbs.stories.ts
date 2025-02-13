import type { StoryFn } from '@storybook/vue3';

import Breadcrumbs, { type PathItem } from './Breadcrumbs.vue';

export default {
	title: 'Atoms/Breadcrumbs',
	component: Breadcrumbs,
	argTypes: {},
};

const items: PathItem[] = [
	{ id: '1', label: 'Home', href: '/', type: 'item' },
	{ id: '2', label: 'Folder1', type: 'item' },
	{ id: '2', label: '', type: 'ellipsis' },
	{ id: '3', label: 'Current', href: '/folder2', type: 'item' },
];

const template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	components: { Breadcrumbs },
	props: Object.keys(argTypes),
	template: '<Breadcrumbs v-bind="args" />',
});

export const Default = template.bind({});
Default.args = {
	items,
};
