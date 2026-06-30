import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { h } from 'vue';

import TreeNodeDefault from './TreeNodeDefault.vue';
import TreeNodeDefaultCheckboxShowcase from './TreeNodeDefaultCheckboxShowcase.vue';
import TreeNodeDefaultShowcase from './TreeNodeDefaultShowcase.vue';

const noop = () => undefined;

const meta = {
	title: 'Experimental/Tree/TreeNodeDefault',
	component: TreeNodeDefault,
	tags: ['autodocs'],
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof TreeNodeDefault>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: 'Workflows',
		icon: 'bolt-filled',
		isExpanded: false,
		isSelected: false,
		hasChildren: false,
		handleToggle: noop,
		handleSelect: noop,
	},
	render: () => h(TreeNodeDefaultShowcase),
};

export const WithCheckbox: Story = {
	args: {
		label: 'Workflows',
		isExpanded: false,
		isSelected: false,
		hasChildren: true,
		handleToggle: noop,
		handleSelect: noop,
	},
	render: () => h(TreeNodeDefaultCheckboxShowcase),
};
