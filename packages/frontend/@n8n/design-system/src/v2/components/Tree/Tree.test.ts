import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { defineComponent } from 'vue';

import type { TreeBranch, TreeProps } from './Tree.types';
import Tree from './Tree.vue';

const treeItems: TreeBranch[] = [
	{
		id: 'parent',
		label: 'Parent',
		icon: 'folder',
		children: [
			{ id: 'child', label: 'Child', icon: 'file-text' },
			{ id: 'sibling', label: 'Sibling', icon: 'file-text' },
		],
	},
	{
		id: 'leaf',
		label: 'Leaf',
		icon: 'variable',
	},
];

const defaultExpanded = ['parent'];

type TreeRenderOptions = {
	props?: Partial<TreeProps>;
	slots?: Record<string, string>;
	attrs?: Record<string, unknown>;
};

function renderTree(options: TreeRenderOptions = {}) {
	const { props: overrideProps, ...rest } = options;

	return render(Tree, {
		...rest,
		props: {
			items: treeItems,
			defaultExpanded,
			...overrideProps,
		},
	});
}

function getRowByLabel(wrapper: ReturnType<typeof renderTree>, label: string) {
	return wrapper.getByText(label).closest('[data-test-id="tree-node"]');
}

interface CustomItem extends TreeBranch {
	uuid: string;
	nodes?: CustomItem[];
}

const customItems: CustomItem[] = [
	{
		id: 'parent',
		uuid: 'parent-uuid',
		label: 'Custom parent',
		nodes: [{ id: 'child', uuid: 'child-uuid', label: 'Custom child' }],
	},
];

function renderCustomTree(props?: Partial<TreeProps>) {
	return render(Tree, {
		props: {
			items: customItems,
			defaultExpanded: ['parent-uuid'],
			getKey: (item) => (item as CustomItem).uuid,
			getChildren: (item) => (item as CustomItem).nodes,
			...props,
		},
	});
}

const CustomNode = defineComponent({
	props: {
		label: { type: String, required: true },
	},
	template: '<span data-test-id="custom-node">{{ label }}</span>',
});

describe('v2/components/Tree', () => {
	describe('rendering', () => {
		it('should render with default data-test-id on root', () => {
			const wrapper = renderTree();

			expect(wrapper.getByTestId('tree')).toBeInTheDocument();
		});

		it('should allow overriding root data-test-id', () => {
			const wrapper = renderTree({
				attrs: { 'data-test-id': 'sidebar-tree' },
			});

			expect(wrapper.getByTestId('sidebar-tree')).toBeInTheDocument();
		});

		it('should forward non-class attributes to root', () => {
			const wrapper = renderTree({
				attrs: { 'aria-label': 'Navigation tree' },
			});

			expect(wrapper.getByTestId('tree')).toHaveAttribute('aria-label', 'Navigation tree');
		});

		it('should propagate disabled state to rows', () => {
			const wrapper = renderTree({
				props: { disabled: true },
			});

			for (const node of wrapper.getAllByTestId('tree-node')) {
				expect(node).toHaveAttribute('data-disabled');
			}
		});
	});

	describe('v-model', () => {
		it('should emit selected item keys on row click', async () => {
			const wrapper = renderTree();

			await userEvent.click(wrapper.getByText('Child'));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['child']]);
			});
		});

		it('should reflect controlled modelValue keys as selected rows', () => {
			const wrapper = renderTree({
				props: { modelValue: ['child'] },
			});

			expect(getRowByLabel(wrapper, 'Child')).toHaveAttribute('data-selected');
		});

		it('should support multiple selection with key arrays', async () => {
			const wrapper = renderTree({
				props: {
					multiple: true,
					modelValue: ['child'],
				},
			});

			await userEvent.click(wrapper.getByText('Sibling'));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['child', 'sibling']]);
			});
		});
	});

	describe('defaultValue', () => {
		it('should use defaultValue keys for initial selection', () => {
			const wrapper = renderTree({
				props: { defaultValue: ['child'] },
			});

			expect(getRowByLabel(wrapper, 'Child')).toHaveAttribute('data-selected');
		});

		it('should emit keys when toggling from defaultValue', async () => {
			const wrapper = renderTree({
				props: { defaultValue: ['child'] },
			});

			await userEvent.click(wrapper.getByText('Sibling'));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['sibling']]);
			});
		});
	});

	describe('custom data accessors', () => {
		it('should resolve keys and children from custom accessors', async () => {
			const wrapper = renderCustomTree();

			expect(wrapper.getByText('Custom child')).toBeInTheDocument();

			await userEvent.click(wrapper.getByText('Custom child'));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['child-uuid']]);
			});
		});
	});

	describe('slots', () => {
		test.each([
			['icon', '<span data-test-id="custom-icon">icon</span>', 'custom-icon'],
			['label', '<span data-test-id="custom-label">label</span>', 'custom-label'],
			[
				'toggle',
				'<button type="button" data-test-id="custom-toggle">toggle</button>',
				'custom-toggle',
			],
		] as const)('should render %s slot content', (slotName, slotContent, testId) => {
			const wrapper = renderTree({
				slots: { [slotName]: slotContent },
			});

			expect(wrapper.getAllByTestId(testId).length).toBeGreaterThan(0);
		});

		it('should render default slot content instead of default row', () => {
			const wrapper = renderTree({
				slots: {
					default: '<div data-test-id="custom-row">custom row</div>',
				},
			});

			expect(wrapper.getAllByTestId('custom-row').length).toBeGreaterThan(0);
			expect(wrapper.queryByTestId('tree-node-label')).not.toBeInTheDocument();
		});

		it('should pass label to label slot scope', () => {
			const wrapper = renderTree({
				slots: {
					label:
						'<template #label="{ label }"><span data-test-id="scoped-label">{{ label }}</span></template>',
				},
			});

			const childLabel = wrapper
				.getAllByTestId('scoped-label')
				.find((element) => element.textContent === 'Child');

			expect(childLabel).toBeInTheDocument();
		});
	});

	describe('custom node', () => {
		it('should render custom node component with item props', () => {
			const wrapper = renderTree({
				props: { node: CustomNode },
			});

			expect(
				wrapper.getAllByTestId('custom-node').find((node) => node.textContent === 'Child'),
			).toHaveTextContent('Child');
		});

		it('should map getNodeProps to custom node props', () => {
			const wrapper = renderTree({
				props: {
					node: CustomNode,
					getNodeProps: () => ({ label: 'Mapped label' }),
				},
			});

			expect(wrapper.getAllByText('Mapped label').length).toBeGreaterThan(0);
		});
	});

	describe('virtualized', () => {
		it('should mount TreeVirtualizer when virtualized', () => {
			const wrapper = renderTree({
				props: { virtualized: true },
			});

			expect(wrapper.container.querySelector('[data-reka-virtualizer]')).toBeInTheDocument();
		});
	});
});
