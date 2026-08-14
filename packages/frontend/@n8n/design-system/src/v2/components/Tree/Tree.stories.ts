/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { defineComponent, type PropType, ref } from 'vue';

import type { TreeBranch, TreeNodeContext } from './Tree.types';
import Tree from './Tree.vue';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

const menuItems: TreeBranch[] = [
	{
		id: 'workflows',
		label: 'Workflows',
		icon: 'bolt-filled',
		children: [
			{
				id: 'all-workflows',
				label: 'All workflows',
				icon: 'list-tree',
				children: [
					{
						id: 'personal-workflows',
						label: 'Personal',
						icon: 'user',
						children: [
							{
								id: 'draft-workflows',
								label: 'Drafts',
								icon: 'file-text',
								children: [
									{
										id: 'recent-drafts',
										label: 'Recent drafts',
										icon: 'history',
										children: [{ id: 'today-drafts', label: 'Edited today', icon: 'clock' }],
									},
									{ id: 'archived-drafts', label: 'Archived', icon: 'archive' },
								],
							},
							{ id: 'published-workflows', label: 'Published', icon: 'check' },
						],
					},
					{ id: 'shared-workflows', label: 'Shared with me' },
					{ id: 'team-workflows', label: 'Team workflows', icon: 'users' },
				],
			},
			{ id: 'workflow-templates', label: 'Templates', icon: 'layout-template' },
			{ id: 'workflow-favorites', label: 'Favorites', icon: 'star' },
		],
	},
	{
		id: 'credentials',
		label: 'Credentials',
		icon: 'lock',
		children: [
			{ id: 'all-credentials', label: 'All credentials', icon: 'key-round' },
			{ id: 'shared-credentials', label: 'Shared credentials', icon: 'share' },
		],
	},
	{
		id: 'executions',
		label: 'Executions',
		icon: 'list',
		children: [
			{ id: 'recent-executions', label: 'Recent', icon: 'play' },
			{ id: 'failed-executions', label: 'Failed', icon: 'circle-x' },
		],
	},
	{
		id: 'variables',
		label: 'Variables',
		icon: 'variable',
	},
	{
		id: 'settings',
		label: 'Settings',
		icon: 'settings',
		children: [
			{ id: 'users', label: 'Users', icon: 'user-round' },
			{ id: 'api', label: 'API', icon: 'plug' },
		],
	},
];

const defaultExpanded = [
	'workflows',
	'all-workflows',
	'personal-workflows',
	'draft-workflows',
	'recent-drafts',
	'credentials',
	'executions',
	'settings',
];

const controlledDemoItems: TreeBranch[] = [
	{
		id: 'workflows',
		label: 'Workflows',
		icon: 'bolt-filled',
		children: [
			{ id: 'all-workflows', label: 'All workflows', icon: 'list-tree' },
			{ id: 'templates', label: 'Templates', icon: 'layout-template' },
		],
	},
	{
		id: 'credentials',
		label: 'Credentials',
		icon: 'lock',
		children: [{ id: 'all-credentials', label: 'All credentials', icon: 'key-round' }],
	},
	{
		id: 'variables',
		label: 'Variables',
		icon: 'variable',
	},
];

const meta = {
	title: 'Experimental/Tree',
	component: Tree,
	tags: ['autodocs'],
	argTypes: {
		disabled: {
			control: 'boolean',
			description: 'Disable tree interaction',
		},
		multiple: {
			control: 'boolean',
			description: 'Allow selecting multiple items',
		},
		showExpandArrow: {
			control: 'boolean',
			description: 'Show chevron toggle for expandable items',
		},
		virtualized: {
			control: 'boolean',
			description: 'Virtualize the flattened list for large trees',
		},
		estimateSize: {
			control: 'number',
			description: 'Estimated row height in px when virtualized',
		},
	},
} satisfies GenericMeta<typeof Tree>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { Tree },
		setup() {
			const selected = ref<string[]>([]);
			const expanded = ref<string[]>([...defaultExpanded]);

			return { args, selected, expanded, menuItems };
		},
		template: `
			<div style="width: 320px; height: 480px;">
				<Tree
					v-bind="args"
					:items="menuItems"
					v-model="selected"
					v-model:expanded="expanded"
				/>
			</div>
		`,
	}),
	args: {
		items: menuItems,
		disabled: false,
		multiple: false,
		showExpandArrow: true,
	},
};

const VIRTUAL_TREE_BRANCHES = 5;
const VIRTUAL_TREE_CATEGORIES = 12;
const VIRTUAL_TREE_ITEMS = 10;

function createNestedVirtualTree(): {
	items: TreeBranch[];
	nodeCount: number;
	defaultExpanded: string[];
} {
	let nodeCount = 0;
	const defaultExpanded: string[] = [];

	const items = Array.from({ length: VIRTUAL_TREE_BRANCHES }, (_, branchIndex) => {
		const branchId = `branch-${branchIndex}`;
		defaultExpanded.push(branchId);
		nodeCount++;

		return {
			id: branchId,
			label: `Department ${branchIndex + 1}`,
			icon: 'list-tree' as const,
			children: Array.from({ length: VIRTUAL_TREE_CATEGORIES }, (_, categoryIndex) => {
				const categoryId = `${branchId}-category-${categoryIndex}`;
				defaultExpanded.push(categoryId);
				nodeCount++;

				return {
					id: categoryId,
					label: `Category ${categoryIndex + 1}`,
					icon: 'layout-template' as const,
					children: Array.from({ length: VIRTUAL_TREE_ITEMS }, (_, itemIndex) => {
						nodeCount++;

						return {
							id: `${categoryId}-item-${itemIndex}`,
							label: `Item ${itemIndex + 1}`,
							icon: 'file-text' as const,
						};
					}),
				};
			}),
		};
	});

	return { items, nodeCount, defaultExpanded };
}

const {
	items: nestedVirtualTreeItems,
	nodeCount: nestedVirtualTreeNodeCount,
	defaultExpanded: nestedVirtualTreeExpanded,
} = createNestedVirtualTree();

export const Virtualized: Story = {
	render: (args) => ({
		components: { Tree },
		setup() {
			const selected = ref<string[]>([]);
			const expanded = ref<string[]>([...nestedVirtualTreeExpanded]);

			return {
				args,
				selected,
				expanded,
				nestedVirtualTreeItems,
				nestedVirtualTreeNodeCount,
				VIRTUAL_TREE_BRANCHES,
				VIRTUAL_TREE_CATEGORIES,
				VIRTUAL_TREE_ITEMS,
			};
		},
		template: `
			<div style="width: 320px; height: 480px; display: flex; flex-direction: column; gap: var(--spacing--2xs);">
				<p style="margin: 0; font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					{{ nestedVirtualTreeNodeCount }} nodes across
					{{ VIRTUAL_TREE_BRANCHES }} departments,
					{{ VIRTUAL_TREE_CATEGORIES }} categories each,
					{{ VIRTUAL_TREE_ITEMS }} items per category
				</p>
				<Tree
					style="flex: 1; min-height: 0;"
					v-bind="args"
					:items="nestedVirtualTreeItems"
					virtualized
					v-model="selected"
					v-model:expanded="expanded"
				/>
			</div>
		`,
	}),
	args: {
		items: nestedVirtualTreeItems,
		virtualized: true,
		estimateSize: 32,
		disabled: false,
		multiple: false,
		showExpandArrow: true,
	},
};

export const Controlled: Story = {
	render: () => ({
		components: { Tree },
		setup() {
			const controlledSelected = ref<string[]>(['all-workflows']);
			const controlledExpanded = ref<string[]>(['workflows']);

			function selectCredentials() {
				controlledSelected.value = ['credentials'];
			}

			function clearSelection() {
				controlledSelected.value = [];
			}

			function expandAll() {
				controlledExpanded.value = ['workflows', 'credentials'];
			}

			function collapseAll() {
				controlledExpanded.value = [];
			}

			return {
				controlledDemoItems,
				controlledSelected,
				controlledExpanded,
				selectCredentials,
				clearSelection,
				expandAll,
				collapseAll,
			};
		},
		template: `
			<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing--md);">
				<section style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
						Controlled
					</h3>
					<p style="margin: 0; font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
						Selection and expansion are owned by the parent via
						<code>v-model</code> and <code>v-model:expanded</code>.
					</p>

					<dl style="display: flex; flex-direction: column; gap: var(--spacing--4xs); margin: 0; font-size: var(--font-size--2xs);">
						<div style="display: grid; grid-template-columns: 5rem 1fr; gap: var(--spacing--3xs);">
							<dt style="margin: 0; color: var(--color--text--tint-1);">Selected</dt>
							<dd style="margin: 0; word-break: break-word;">{{ controlledSelected.join(', ') || 'none' }}</dd>
						</div>
						<div style="display: grid; grid-template-columns: 5rem 1fr; gap: var(--spacing--3xs);">
							<dt style="margin: 0; color: var(--color--text--tint-1);">Expanded</dt>
							<dd style="margin: 0; word-break: break-word;">{{ controlledExpanded.join(', ') || 'none' }}</dd>
						</div>
					</dl>

					<div style="display: flex; flex-wrap: wrap; gap: var(--spacing--3xs);">
						<button type="button" @click="selectCredentials">Select credentials</button>
						<button type="button" @click="clearSelection">Clear selection</button>
						<button type="button" @click="expandAll">Expand all</button>
						<button type="button" @click="collapseAll">Collapse all</button>
					</div>

					<div
						style="width: 100%; max-width: 320px; min-height: 240px; padding: var(--spacing--2xs); border: 1px solid var(--border-color--subtle); border-radius: var(--radius);"
					>
						<Tree
							:items="controlledDemoItems"
							v-model="controlledSelected"
							v-model:expanded="controlledExpanded"
						/>
					</div>
				</section>

				<section style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
						Uncontrolled
					</h3>
					<p style="margin: 0; font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
						Initial state is set with <code>default-value</code> and
						<code>default-expanded</code>. The tree manages its own state after mount.
					</p>

					<div
						style="width: 100%; max-width: 320px; min-height: 240px; padding: var(--spacing--2xs); border: 1px solid var(--border-color--subtle); border-radius: var(--radius);"
					>
						<Tree
							:items="controlledDemoItems"
							:default-value="['all-workflows']"
							:default-expanded="['workflows']"
						/>
					</div>
				</section>
			</div>
		`,
	}),
	args: {
		items: controlledDemoItems,
		disabled: false,
		multiple: false,
		showExpandArrow: true,
	},
};

type EmojiTreeBranch = Omit<TreeBranch, 'children'> & {
	emoji?: string;
	children?: EmojiTreeBranch[];
};

const customNodeItems: EmojiTreeBranch[] = [
	{
		id: 'planets',
		label: 'Planets',
		emoji: '🪐',
		children: [
			{
				id: 'inner',
				label: 'Inner solar system',
				emoji: '☀️',
				children: [
					{ id: 'mercury', label: 'Mercury', emoji: '☿️' },
					{ id: 'venus', label: 'Venus', emoji: '♀️' },
					{
						id: 'earth',
						label: 'Earth',
						emoji: '🌍',
						children: [
							{
								id: 'continents',
								label: 'Continents',
								emoji: '🗺️',
								children: [
									{
										id: 'europe',
										label: 'Europe',
										emoji: '🇪🇺',
										children: [
											{
												id: 'france',
												label: 'France',
												emoji: '🇫🇷',
												children: [
													{ id: 'paris', label: 'Paris', emoji: '🗼' },
													{ id: 'lyon', label: 'Lyon', emoji: '🏙️' },
												],
											},
											{
												id: 'germany',
												label: 'Germany',
												emoji: '🇩🇪',
												children: [{ id: 'berlin', label: 'Berlin', emoji: '🐻' }],
											},
										],
									},
									{
										id: 'asia',
										label: 'Asia',
										emoji: '🌏',
										children: [{ id: 'japan', label: 'Japan', emoji: '🇯🇵' }],
									},
								],
							},
						],
					},
					{ id: 'mars', label: 'Mars', emoji: '🔴' },
				],
			},
			{
				id: 'outer',
				label: 'Outer solar system',
				emoji: '🌌',
				children: [
					{ id: 'jupiter', label: 'Jupiter', emoji: '🟠' },
					{ id: 'saturn', label: 'Saturn', emoji: '🪐' },
					{ id: 'uranus', label: 'Uranus', emoji: '🔵' },
					{ id: 'neptune', label: 'Neptune', emoji: '🌀' },
				],
			},
		],
	},
	{
		id: 'animals',
		label: 'Animals',
		emoji: '🦁',
		children: [
			{
				id: 'mammals',
				label: 'Mammals',
				emoji: '🐻',
				children: [
					{
						id: 'bears',
						label: 'Bears',
						emoji: '🐻‍❄️',
						children: [
							{ id: 'grizzly', label: 'Grizzly bear', emoji: '🐻' },
							{ id: 'polar', label: 'Polar bear', emoji: '🐻‍❄️' },
						],
					},
					{ id: 'cats', label: 'Cats', emoji: '🐱' },
				],
			},
			{ id: 'birds', label: 'Birds', emoji: '🦅' },
			{ id: 'fish', label: 'Fish', emoji: '🐠' },
		],
	},
	{
		id: 'weather',
		label: 'Weather',
		emoji: '🌤️',
		children: [
			{ id: 'sunny', label: 'Sunny', emoji: '☀️' },
			{ id: 'rainy', label: 'Rainy', emoji: '🌧️' },
			{ id: 'snowy', label: 'Snowy', emoji: '❄️' },
		],
	},
];

const customNodeDefaultExpanded = [
	'planets',
	'inner',
	'earth',
	'continents',
	'europe',
	'france',
	'outer',
	'animals',
	'mammals',
	'bears',
];

function getCustomNodeProps({ item }: TreeNodeContext<EmojiTreeBranch>): {
	label: string;
	emoji?: string;
} {
	const treeItem = item.value;

	return { label: treeItem.label, emoji: treeItem.emoji };
}

const customNodeClass = {
	treeItem: 'sb-tree-custom-item',
	treeItemSelected: 'sb-tree-custom-item--selected',
	treeItemDisabled: 'sb-tree-custom-item--disabled',
	treeItemTrackline: 'sb-tree-custom-item__trackline',
	treeItemEmoji: 'sb-tree-custom-item__emoji',
	treeItemLabel: 'sb-tree-custom-item__label',
	treeItemToggle: 'sb-tree-custom-item__toggle',
	treeItemToggleIcon: 'sb-tree-custom-item__toggle-icon',
	treeItemToggleIconExpanded: 'sb-tree-custom-item__toggle-icon--expanded',
} as const;

const customNodeStyles = `
.${customNodeClass.treeItem} {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	box-sizing: border-box;
	width: 100%;
	height: var(--tree-item-height);
	position: relative;
	padding-block: var(--tree-item-padding-block);
	padding-inline: var(--tree-item-padding-inline);
	padding-left: calc(
		var(--tree-item-padding-inline) + var(--tree-indent-unit) * var(--tree-indent, 0)
	);
	border-radius: var(--radius--lg);
	cursor: pointer;
	user-select: none;
	color: var(--color--text--shade-1);
	background-color: light-dark(var(--color--neutral-100), var(--color--neutral-800));
	transition:
		background-color 0.15s ease,
		box-shadow 0.15s ease;
}

.${customNodeClass.treeItem}[data-has-toggle] {
	padding-right: calc(var(--tree-item-padding-inline) * 2);
}

.${customNodeClass.treeItem}:hover:not([data-disabled]) {
	background-color: light-dark(var(--color--neutral-200), var(--color--neutral-700));
}

.${customNodeClass.treeItem}:active:not([data-disabled]) {
	box-shadow: inset 0 0 0 1px var(--border-color--subtle);
}

[role='treeitem']:focus-visible .${customNodeClass.treeItem} {
	outline: var(--focus--border-width) solid var(--focus--outline-color);
	outline-offset: 0;
}

.${customNodeClass.treeItemSelected} {
	color: var(--color--primary);
	background-color: light-dark(var(--color--primary--tint-3), var(--color--primary--shade-3));
	box-shadow: inset 3px 0 0 var(--color--primary);
}

.${customNodeClass.treeItemSelected}:hover:not([data-disabled]),
.${customNodeClass.treeItemSelected}:active:not([data-disabled]),
[role='treeitem']:focus-visible .${customNodeClass.treeItemSelected} {
	background-color: light-dark(var(--color--primary--tint-3), var(--color--primary--shade-3));
}

.${customNodeClass.treeItemSelected} .${customNodeClass.treeItemEmoji} {
	background-color: light-dark(var(--color--background--light-1), var(--color--background--dark-1));
}

.${customNodeClass.treeItemDisabled} {
	cursor: not-allowed;
	opacity: 0.5;
}

.${customNodeClass.treeItemTrackline} {
	position: absolute;
	top: 0;
	bottom: 0;
	left: calc(
		var(--tree-item-padding-inline) + var(--tree-indent-unit) * var(--indent) +
			var(--tree-icon-size) / 2
	);
	z-index: 1;
	width: 1px;
	background-color: var(--border-color--subtle);
	pointer-events: none;
}

.${customNodeClass.treeItemEmoji} {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--tree-icon-size);
	height: var(--tree-icon-size);
	border-radius: var(--radius--full);
	font-size: var(--font-size--sm);
	line-height: 1;
	background-color: light-dark(var(--color--background--light-1), var(--color--background--dark-1));
}

.${customNodeClass.treeItemToggle} {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	margin-left: auto;
	border: none;
	background: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;
}

.${customNodeClass.treeItemToggle}:disabled {
	cursor: not-allowed;
}

.${customNodeClass.treeItemToggleIcon} {
	font-size: var(--font-size--2xs);
	line-height: 1;
	transition: transform var(--duration--snappy) var(--easing--ease-out);
}

@media (prefers-reduced-motion: reduce) {
	.${customNodeClass.treeItemToggleIcon} {
		transition: none;
	}
}

.${customNodeClass.treeItemToggleIconExpanded} {
	transform: rotate(90deg);
}

.${customNodeClass.treeItemLabel} {
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
`;

let customNodeStylesInjected = false;

function ensureCustomNodeStyles() {
	if (customNodeStylesInjected || typeof document === 'undefined') {
		return;
	}

	const style = document.createElement('style');
	style.textContent = customNodeStyles;
	document.head.appendChild(style);
	customNodeStylesInjected = true;
}

const TreeNodeCustom = defineComponent({
	name: 'TreeNodeCustom',
	props: {
		label: { type: String, required: true },
		emoji: { type: String, required: false },
		disabled: { type: Boolean, default: false },
		showExpandArrow: { type: Boolean, default: true },
		isExpanded: { type: Boolean, required: true },
		isSelected: { type: Boolean, required: true },
		hasChildren: { type: Boolean, required: true },
		indentLevel: { type: Number, default: 0 },
		handleToggle: { type: Function as PropType<() => void>, required: true },
		handleSelect: { type: Function as PropType<() => void>, required: true },
	},
	setup() {
		ensureCustomNodeStyles();

		return { customNodeClass };
	},
	template: `
		<div
			:class="[
				customNodeClass.treeItem,
				{
					[customNodeClass.treeItemSelected]: isSelected,
					[customNodeClass.treeItemDisabled]: disabled,
				},
			]"
			:style="{ '--tree-indent': indentLevel }"
			:data-disabled="disabled ? '' : undefined"
			:data-has-toggle="showExpandArrow && hasChildren ? '' : undefined"
			@click="!disabled && handleSelect()"
		>
			<template v-if="indentLevel > 0">
				<div
					v-for="n in indentLevel"
					:key="n"
					:class="customNodeClass.treeItemTrackline"
					:style="{ '--indent': n - 1 }"
					aria-hidden="true"
				/>
			</template>

			<span v-if="emoji" :class="customNodeClass.treeItemEmoji" aria-hidden="true">
				{{ emoji }}
			</span>

			<span
				:class="customNodeClass.treeItemLabel"
				:aria-disabled="disabled ? 'true' : undefined"
			>
				{{ label }}
			</span>

			<button
				v-if="showExpandArrow && hasChildren"
				type="button"
				:class="customNodeClass.treeItemToggle"
				:aria-label="isExpanded ? \`Collapse \${label}\` : \`Expand \${label}\`"
				:aria-expanded="isExpanded"
				:disabled="disabled"
				@click.stop="handleToggle()"
			>
				<span
					:class="[
						customNodeClass.treeItemToggleIcon,
						{ [customNodeClass.treeItemToggleIconExpanded]: isExpanded },
					]"
					aria-hidden="true"
				>
					▶
				</span>
			</button>
		</div>
	`,
});

export const CustomNode: Story = {
	render: (args) => ({
		components: { Tree, TreeNodeCustom },
		setup() {
			const selected = ref<string[]>(['paris']);
			const expanded = ref<string[]>([...customNodeDefaultExpanded]);

			return {
				args,
				selected,
				expanded,
				customNodeItems,
				getCustomNodeProps,
				TreeNodeCustom,
			};
		},
		template: `
			<div style="width: 320px; height: 480px;">
				<Tree
					v-bind="args"
					:items="customNodeItems"
					:node="TreeNodeCustom"
					:get-node-props="getCustomNodeProps"
					v-model="selected"
					v-model:expanded="expanded"
				/>
			</div>
		`,
	}),
	args: {
		items: customNodeItems,
		disabled: false,
		multiple: false,
		showExpandArrow: true,
	},
};
