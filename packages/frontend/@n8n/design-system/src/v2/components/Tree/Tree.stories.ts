import type { StoryFn } from '@storybook/vue3-vite';

import type { IMenuItem } from '@n8n/design-system/types/menu';

import { Tree } from '.';

export default {
	title: 'V2/Atoms/Tree',
	component: Tree,
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { Tree },
	template: '<Tree v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {
	getKey: (item: IMenuItem) => item.id,

	items: [
		{
			id: 'item1',
			label: 'Root Item 1',
			children: [
				{ id: 'child1', label: 'Child 1', children: [{ id: 'subchild1', label: 'Subchild 1' }] },
				{ id: 'child2', label: 'Child 2' },
			],
		},
		{
			id: 'item2',
			label: 'Root Item 2',
		},
	] satisfies IMenuItem[],
	estimateSize: 32,
};
