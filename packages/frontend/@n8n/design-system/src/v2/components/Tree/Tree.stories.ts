import type { StoryFn } from '@storybook/vue3-vite';
import type { Component } from 'vue';

import type { IMenuItem } from '@n8n/design-system/types/menu';

import { Tree, type TreeItem } from '.';

export default {
	title: 'V2/Atoms/Tree',
	component: Tree as unknown as Component, // Type assertion to avoid generic component issues in Storybook
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { Tree: Tree as unknown as Component },
	template: '<Tree v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {
	getKey: (item: IMenuItem) => item.id,

	items: [
		{
			id: 'item1',
			label: 'Root Item 1',
			icon: 'folder',
			children: [
				{
					id: 'child1',
					icon: 'folder',
					label: 'Child 1',
					children: [{ id: 'subchild1', label: 'Subchild 1' }],
				},
				{ id: 'child2', label: 'Child 2' },
			],
		},
		{
			id: 'item2',
			icon: 'folder',
			label: 'Root Item 2',
		},
	] satisfies IMenuItem[],
	estimateSize: 32,
};

// Example with a custom generic type
interface CustomTreeItem extends TreeItem {
	name: string;
	type: 'folder' | 'file';
	size?: number;
	children?: CustomTreeItem[];
}

export const CustomGeneric = Template.bind({});
CustomGeneric.args = {
	getKey: (item: CustomTreeItem) => item.id,

	items: [
		{
			id: 'folder1',
			name: 'Documents',
			type: 'folder',
			children: [
				{
					id: 'file1',
					name: 'readme.txt',
					type: 'file',
					size: 1024,
				},
				{
					id: 'folder2',
					name: 'Images',
					type: 'folder',
					children: [
						{
							id: 'file2',
							name: 'photo.jpg',
							type: 'file',
							size: 2048576,
						},
					],
				},
			],
		},
		{
			id: 'file3',
			name: 'config.json',
			type: 'file',
			size: 512,
		},
	] satisfies CustomTreeItem[],
	estimateSize: 32,
};
