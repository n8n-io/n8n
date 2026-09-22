import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, onMounted, ref } from 'vue';

import type { ContextMenuLeaf, ContextMenuNode, ContextMenuProps } from './ContextMenu.types';
import ContextMenu from './ContextMenu.vue';
import N8nAvatar from '../N8nAvatar/Avatar.vue';
import N8nBadge from '../N8nBadge/Badge.vue';
import N8nButton from '../N8nButton/Button.vue';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nKeyboardShortcut from '../N8nKeyboardShortcut/N8nKeyboardShortcut.vue';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

const exampleItems: Array<ContextMenuNode<string>> = [
	{
		type: 'group',
		id: 'edit',
		children: [
			{
				type: 'item',
				id: 'open',
				label: 'Open',
				icon: { type: 'icon', value: 'external-link' },
			},
			{
				type: 'item',
				id: 'rename',
				label: 'Rename',
				shortcut: { keys: ['Space'] },
			},
		],
	},
	{
		type: 'submenu',
		id: 'export',
		label: 'Export as…',
		icon: { type: 'icon', value: 'download' },
		children: [
			{ type: 'item', id: 'export-json', label: 'JSON' },
			{
				type: 'submenu',
				id: 'export-csv-options',
				label: 'CSV',
				children: [
					{ type: 'item', id: 'export-csv-comma', label: 'Comma' },
					{ type: 'item', id: 'export-csv-tab', label: 'Tab' },
				],
			},
		],
	},
	{
		type: 'radio-group',
		id: 'snap',
		label: 'Snap',
		children: [
			{ type: 'radio', id: 'snap-off', label: 'Off' },
			{ type: 'radio', id: 'snap-grid', label: 'Grid' },
		],
	},
	{
		type: 'group',
		id: 'view',
		children: [
			{ type: 'checkbox', id: 'show-grid', label: 'Show grid' },
			{ type: 'checkbox', id: 'show-minimap', label: 'Show minimap' },
		],
	},
	{
		type: 'group',
		id: 'danger',
		children: [
			{
				type: 'item',
				id: 'delete',
				label: 'Delete',
				icon: { type: 'icon', value: 'trash' },
				variant: 'destructive',
			},
		],
	},
];

const checkboxItems: Array<ContextMenuNode<string>> = [
	{
		type: 'group',
		id: 'view',
		label: 'View',
		children: [
			{ type: 'checkbox', id: 'show-grid', label: 'Show grid' },
			{ type: 'checkbox', id: 'show-minimap', label: 'Show minimap' },
			{ type: 'checkbox', id: 'show-rulers', label: 'Show rulers' },
			{ type: 'checkbox', id: 'snap-to-objects', label: 'Snap to objects', disabled: true },
		],
	},
];

function buildNestedSubmenus(levels: number): ContextMenuNode {
	let children: ContextMenuNode[] = [
		{ type: 'item', id: `action-${levels}`, label: `Action at level ${levels}` },
	];

	for (let level = levels; level >= 2; level--) {
		children = [
			{ type: 'item', id: `peek-${level}`, label: `Item at level ${level}` },
			{
				type: 'submenu',
				id: `level-${level}`,
				label: `Level ${level}…`,
				children,
			},
		];
	}

	return {
		type: 'submenu',
		id: 'level-1',
		label: 'Level 1…',
		icon: { type: 'icon', value: 'layers' },
		children,
	};
}

const nestedItems: Array<ContextMenuNode<string>> = [buildNestedSubmenus(12)];

const alignedSubmenuItems: Array<ContextMenuNode<string>> = [
	{
		type: 'submenu',
		id: 'file',
		label: 'File',
		icon: { type: 'icon', value: 'file' },
		children: [
			{
				type: 'submenu',
				id: 'file-new',
				label: 'New',
				icon: { type: 'icon', value: 'plus' },
				children: [
					{
						type: 'submenu',
						id: 'file-new-from',
						label: 'From template',
						children: [
							{ type: 'item', id: 'file-new-http', label: 'HTTP Request' },
							{ type: 'item', id: 'file-new-ai', label: 'AI Agent' },
						],
					},
					{ type: 'item', id: 'file-new-workflow', label: 'Workflow' },
					{ type: 'item', id: 'file-new-credential', label: 'Credential' },
				],
			},
			{ type: 'item', id: 'file-open', label: 'Open' },
			{ type: 'item', id: 'file-save', label: 'Save' },
		],
	},
	{
		type: 'submenu',
		id: 'edit',
		label: 'Edit',
		icon: { type: 'icon', value: 'pen' },
		children: [
			{
				type: 'submenu',
				id: 'edit-copy',
				label: 'Copy as…',
				icon: { type: 'icon', value: 'copy' },
				children: [
					{
						type: 'submenu',
						id: 'edit-copy-format',
						label: 'Format',
						children: [
							{ type: 'item', id: 'edit-copy-json', label: 'JSON' },
							{ type: 'item', id: 'edit-copy-yaml', label: 'YAML' },
						],
					},
					{ type: 'item', id: 'edit-copy-path', label: 'Path' },
					{ type: 'item', id: 'edit-copy-id', label: 'ID' },
				],
			},
			{ type: 'item', id: 'edit-paste', label: 'Paste' },
			{ type: 'item', id: 'edit-duplicate', label: 'Duplicate' },
		],
	},
	{
		type: 'submenu',
		id: 'view',
		label: 'View',
		icon: { type: 'icon', value: 'eye' },
		children: [
			{
				type: 'submenu',
				id: 'view-zoom',
				label: 'Zoom',
				children: [
					{
						type: 'submenu',
						id: 'view-zoom-preset',
						label: 'Preset',
						children: [
							{ type: 'item', id: 'view-zoom-50', label: '50%' },
							{ type: 'item', id: 'view-zoom-100', label: '100%' },
							{ type: 'item', id: 'view-zoom-200', label: '200%' },
						],
					},
					{ type: 'item', id: 'view-zoom-in', label: 'Zoom in' },
					{ type: 'item', id: 'view-zoom-out', label: 'Zoom out' },
				],
			},
			{ type: 'item', id: 'view-grid', label: 'Show grid' },
			{ type: 'item', id: 'view-minimap', label: 'Show minimap' },
		],
	},
	{
		type: 'submenu',
		id: 'share',
		label: 'Share',
		icon: { type: 'icon', value: 'share' },
		children: [
			{
				type: 'submenu',
				id: 'share-with',
				label: 'Share with…',
				icon: { type: 'icon', value: 'user' },
				children: [
					{
						type: 'submenu',
						id: 'share-with-team',
						label: 'Team',
						children: [
							{ type: 'item', id: 'share-team-design', label: 'Design' },
							{ type: 'item', id: 'share-team-engineering', label: 'Engineering' },
						],
					},
					{ type: 'item', id: 'share-ada', label: 'Ada Lovelace' },
					{ type: 'item', id: 'share-grace', label: 'Grace Hopper' },
				],
			},
			{ type: 'item', id: 'share-link', label: 'Copy link' },
			{ type: 'item', id: 'share-embed', label: 'Embed' },
		],
	},
	{
		type: 'submenu',
		id: 'export',
		label: 'Export',
		icon: { type: 'icon', value: 'download' },
		children: [
			{
				type: 'submenu',
				id: 'export-as',
				label: 'Export as…',
				children: [
					{
						type: 'submenu',
						id: 'export-spreadsheet',
						label: 'Spreadsheet',
						children: [
							{ type: 'item', id: 'export-xlsx', label: 'Excel' },
							{ type: 'item', id: 'export-csv', label: 'CSV' },
						],
					},
					{ type: 'item', id: 'export-json', label: 'JSON' },
					{ type: 'item', id: 'export-png', label: 'PNG' },
				],
			},
			{ type: 'item', id: 'export-print', label: 'Print' },
		],
	},
];

const teamUserNames = [
	'Ada Lovelace',
	'Alan Turing',
	'Grace Hopper',
	'Katherine Johnson',
	'Margaret Hamilton',
	'Dorothy Vaughan',
	'Mary Jackson',
	'Hedy Lamarr',
	'Annie Easley',
	'Radia Perlman',
	'Barbara Liskov',
	'Frances Allen',
	'Jean Bartik',
	'Betty Holberton',
	'Marlyn Meltzer',
	'Kathleen Antonelli',
	'Ruth Teitelbaum',
	'Shafi Goldwasser',
	'Fei-Fei Li',
	'Timnit Gebru',
	'Joy Buolamwini',
	'Yoshua Bengio',
	'Geoffrey Hinton',
	'Yann LeCun',
	'Andrew Ng',
	'Demis Hassabis',
	'Satya Nadella',
	'Reshma Saujani',
	'Limor Fried',
	'Lynn Conway',
	'Sophie Wilson',
	'Steve Wozniak',
	'Vint Cerf',
	'Tim Berners-Lee',
	'Guido van Rossum',
	'Bjarne Stroustrup',
	'Ken Thompson',
	'Dennis Ritchie',
	'Brian Kernighan',
	'Donald Knuth',
];

const customWidthItems: Array<ContextMenuNode<string>> = [
	{
		type: 'group',
		id: 'actions',
		children: [
			{
				type: 'item',
				id: 'duplicate',
				label: 'Duplicate this workflow to another project',
				icon: { type: 'icon', value: 'copy' },
			},
			{
				type: 'item',
				id: 'rename',
				label: 'Rename this workflow to something more descriptive',
			},
		],
	},
	{
		type: 'submenu',
		id: 'export',
		label: 'Export this workflow as another format…',
		icon: { type: 'icon', value: 'download' },
		children: [
			{ type: 'item', id: 'export-json', label: 'JSON with pretty-printed indentation' },
			{ type: 'item', id: 'export-csv', label: 'CSV with comma-separated values' },
		],
	},
	{
		type: 'group',
		id: 'danger',
		children: [
			{
				type: 'item',
				id: 'delete',
				label: 'Delete this workflow from the project',
				icon: { type: 'icon', value: 'trash' },
				variant: 'destructive',
			},
		],
	},
];

const heightConstrainedItems: Array<ContextMenuNode<string>> = teamUserNames.map(
	(name): ContextMenuNode<string> => ({
		type: 'item',
		id: `item-${name.toLowerCase().replaceAll(' ', '-')}`,
		label: name,
	}),
);

function splitPersonName(fullName: string) {
	const lastSpace = fullName.lastIndexOf(' ');
	if (lastSpace === -1) {
		return { firstName: fullName, lastName: '' };
	}
	return {
		firstName: fullName.slice(0, lastSpace),
		lastName: fullName.slice(lastSpace + 1),
	};
}

const radioItems: Array<ContextMenuNode<string>> = [
	{
		type: 'radio-group',
		id: 'snap',
		label: 'Snap',
		children: [
			{ type: 'radio', id: 'snap-off', label: 'Off' },
			{ type: 'radio', id: 'snap-grid', label: 'Grid' },
			{ type: 'radio', id: 'snap-guides', label: 'Guides', disabled: true },
		],
	},
	{
		type: 'radio-group',
		id: 'theme',
		label: 'Theme',
		children: [
			{ type: 'radio', id: 'theme-system', label: 'System' },
			{ type: 'radio', id: 'theme-light', label: 'Light' },
			{ type: 'radio', id: 'theme-dark', label: 'Dark' },
		],
	},
];

const storyTriggerStyle = `
.context-menu-story {
	width: 100%;
}
.context-menu-story-trigger {
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	width: 100%;
	height: 12rem;
	flex-shrink: 0;
	padding: var(--spacing--lg);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--lg);
	color: var(--text-color--subtler);
	text-align: center;
	background-color: transparent;
	cursor: context-menu;
	transition:
		background-color var(--duration--snappy) var(--easing--ease-out),
		border-color var(--duration--snappy) var(--easing--ease-out);
}
.context-menu-story-trigger:hover {
	background-color: var(--background--hover);
	border-color: var(--border-color--strong);
}
`;

function leadingIconColor(item: ContextMenuLeaf<string>) {
	return item.type === 'item' && item.variant === 'destructive'
		? '--icon-color--danger'
		: '--icon-color';
}

const meta = {
	title: 'Core/ContextMenu',
	component: ContextMenu,
	tags: ['autodocs'],
	parameters: {
		docs: {
			source: { type: 'dynamic' },
			description: {
				component: 'A menu that opens at the pointer on right-click or long-press.',
			},
		},
	},
	argTypes: {
		items: {
			control: 'object',
			description: 'Menu tree to render',
		},
		selectedValues: {
			control: 'object',
			description:
				'Controlled selected ids for checkbox and radio items. Supports v-model:selectedValues.',
		},
		defaultSelectedValues: {
			control: 'object',
			description: 'Initial selected ids when uncontrolled',
		},
		disabled: {
			control: 'boolean',
			description: 'Disable the trigger',
		},
		loading: {
			control: 'boolean',
			description: 'Show skeleton rows instead of items',
		},
		loadingItemCount: {
			control: 'number',
			description: 'Number of skeleton rows while loading',
		},
		contentClass: {
			control: 'text',
			description:
				'Extra CSS class for every panel. Set --context-menu--width for a fixed panel width.',
		},
		modal: {
			control: 'boolean',
			description: 'Block pointer events on the rest of the page while open',
		},
	},
	decorators: [
		() => ({
			setup() {
				return { storyTriggerStyle };
			},
			template: `
				<div class="context-menu-story">
					<component :is="'style'">{{ storyTriggerStyle }}</component>
					<story />
				</div>
			`,
		}),
	],
} satisfies GenericMeta<typeof ContextMenu<string>>;

export default meta;

type Story = Omit<StoryObj<ContextMenuProps<string>>, 'render'> & {
	render?: (args: ContextMenuProps<string>) => unknown;
};

function logSelect(action: string) {
	console.log('Selected:', action);
}

function renderMenuStory(args: ContextMenuProps<string>) {
	return {
		components: { ContextMenu },
		setup() {
			return { args, logSelect };
		},
		template: `
			<ContextMenu v-bind="args" @select="logSelect">
				<template #trigger>
					<div class="context-menu-story-trigger">
						Right-click here
					</div>
				</template>
			</ContextMenu>
		`,
	};
}

const defaultStoryArgs = {
	items: exampleItems,
	disabled: false,
	loading: false,
	loadingItemCount: 3,
	modal: true,
};

export const Default: Story = {
	render: (args) => renderMenuStory(args),
	args: defaultStoryArgs,
};

export const ControlledUncontrolled: Story = {
	name: 'Controlled/Uncontrolled',
	render: (args) => ({
		components: { ContextMenu, N8nButton },
		setup() {
			const selectedValues = ref(['show-grid']);
			const presets: Array<{ label: string; values: string[] }> = [
				{ label: 'Grid only', values: ['show-grid'] },
				{ label: 'Grid + minimap', values: ['show-grid', 'show-minimap'] },
				{ label: 'Clear', values: [] },
			];
			return { args, checkboxItems, selectedValues, presets, logSelect };
		},
		template: `
			<div style="display:flex;flex-direction:column;gap:var(--spacing--xl);">
				<section style="display:flex;flex-direction:column;gap:var(--spacing--sm);">
					<h3 style="margin:0;font-size:var(--font-size--sm);font-weight:var(--font-weight--bold);">
						Controlled
					</h3>
					<p style="margin:0;font-size:var(--font-size--sm);color:var(--text-color--subtler);">
						Selected: <strong>{{ selectedValues.length ? selectedValues.join(', ') : '(empty)' }}</strong>
					</p>
					<ContextMenu
						:items="args.items"
						v-model:selected-values="selectedValues"
						@select="logSelect"
					>
						<template #trigger>
							<div class="context-menu-story-trigger">
								Right-click here
							</div>
						</template>
					</ContextMenu>
					<div style="display:flex;gap:var(--spacing--2xs);flex-wrap:wrap;">
						<N8nButton
							v-for="preset in presets"
							:key="preset.label"
							size="small"
							variant="outline"
							@click="selectedValues = [...preset.values]"
						>
							{{ preset.label }}
						</N8nButton>
					</div>
				</section>
				<section style="display:flex;flex-direction:column;gap:var(--spacing--sm);">
					<h3 style="margin:0;font-size:var(--font-size--sm);font-weight:var(--font-weight--bold);">
						Uncontrolled
					</h3>
					<ContextMenu
						:items="checkboxItems"
						:default-selected-values="['show-grid', 'show-minimap']"
						@select="logSelect"
					>
						<template #trigger>
							<div class="context-menu-story-trigger">
								Right-click here
							</div>
						</template>
					</ContextMenu>
				</section>
			</div>
		`,
	}),
	args: {
		items: checkboxItems,
	},
};

export const WithRadios: Story = {
	render: (args) => renderMenuStory(args),
	args: {
		items: radioItems,
		defaultSelectedValues: ['snap-grid', 'theme-system'],
	},
};

export const WithCheckboxes: Story = {
	render: (args) => renderMenuStory(args),
	args: {
		items: checkboxItems,
		defaultSelectedValues: ['show-grid'],
	},
};

export const WithSlots: Story = {
	name: 'With Slots',
	render: () => ({
		components: { ContextMenu, N8nBadge, N8nIcon, N8nKeyboardShortcut },
		setup() {
			const items: Array<ContextMenuNode<string>> = [
				{
					type: 'group',
					id: 'file',
					children: [
						{
							type: 'item',
							id: 'open',
							label: 'Open',
							icon: { type: 'icon', value: 'external-link' },
							shortcut: { metaKey: true, keys: ['O'] },
						},
						{
							type: 'item',
							id: 'share',
							label: 'Share',
							icon: { type: 'icon', value: 'share-2' },
						},
						{
							type: 'item',
							id: 'color',
							label: 'Set color',
							keepOpen: true,
						},
					],
				},
				{
					type: 'submenu',
					id: 'assign',
					label: 'Assign to…',
					icon: { type: 'icon', value: 'user' },
					children: [
						{ type: 'item', id: 'user-ada', label: 'Ada Lovelace' },
						{ type: 'item', id: 'user-grace', label: 'Grace Hopper' },
						{ type: 'item', id: 'user-alan', label: 'Alan Turing' },
					],
				},
				{
					type: 'group',
					id: 'danger',
					children: [
						{
							type: 'item',
							id: 'delete',
							label: 'Delete',
							icon: { type: 'icon', value: 'trash' },
							variant: 'destructive',
						},
					],
				},
			];

			return { items, logSelect, leadingIconColor };
		},
		template: `
			<ContextMenu :items="items" @select="logSelect">
				<template #trigger>
					<div class="context-menu-story-trigger">
						Right-click here
					</div>
				</template>

				<template #item-leading="{ item, ui }">
					<span
						v-if="item.id === 'color'"
						:class="ui.class"
						style="display:block;width:var(--spacing--sm);height:var(--spacing--sm);border-radius:var(--radius--full);background:var(--background--brand);"
					/>
					<N8nIcon
						v-else-if="item.icon?.type === 'icon'"
						:icon="item.icon.value"
						:class="ui.class"
						size="large"
						:color="leadingIconColor(item)"
					/>
				</template>

				<template #item-label="{ item, ui }">
					<span :class="ui.class">
						{{ item.label }}
						<span
							v-if="item.id === 'user-ada'"
							style="color:var(--text-color--subtler);font-size:var(--font-size--2xs);"
						>
							Owner
						</span>
					</span>
				</template>

				<template #item-trailing="{ item, ui }">
					<N8nBadge v-if="item.id === 'share'" theme="success" bold :class="ui.class">
						New
					</N8nBadge>
					<N8nKeyboardShortcut
						v-else-if="item.shortcut"
						v-bind="item.shortcut"
						:class="ui.class"
					/>
				</template>
			</ContextMenu>
		`,
	}),
	args: {
		items: [],
	},
};

export const AsyncLoading: Story = {
	name: 'Async Loading',
	render: () => ({
		components: { ContextMenu, N8nButton },
		setup() {
			const items = ref<Array<ContextMenuNode<string>>>([]);
			const loading = ref(false);

			async function loadItems() {
				loading.value = true;
				items.value = [];
				await new Promise((resolve) => setTimeout(resolve, 1500));
				items.value = exampleItems;
				loading.value = false;
			}

			onMounted(() => {
				void loadItems();
			});

			return { items, loading, loadItems, logSelect };
		},
		template: `
			<div style="display:flex;flex-direction:column;gap:var(--spacing--md);">
				<ContextMenu :items="items" :loading="loading" @select="logSelect">
					<template #trigger>
						<div class="context-menu-story-trigger">
							Right-click here
						</div>
					</template>
				</ContextMenu>
				<N8nButton
					:label="loading ? 'Loading items…' : 'Reload items'"
					:disabled="loading"
					variant="outline"
					@click="loadItems"
				/>
			</div>
		`,
	}),
	args: {
		items: exampleItems,
	},
};

export const MoreLevels: Story = {
	name: 'More Levels',
	render: (args) => ({
		components: { ContextMenu },
		setup() {
			return { args, logSelect };
		},
		template: `
			<ContextMenu v-bind="args" @select="logSelect">
				<template #trigger>
					<div class="context-menu-story-trigger">
						Right-click here, then open Level 1… through Level 12
					</div>
				</template>
			</ContextMenu>
		`,
	}),
	args: {
		items: nestedItems,
	},
};

export const AlignedSubmenus: Story = {
	name: 'Aligned Submenus',
	render: (args) => ({
		components: { ContextMenu },
		setup() {
			return { args, logSelect };
		},
		template: `
			<ContextMenu v-bind="args" @select="logSelect">
				<template #trigger>
					<div class="context-menu-story-trigger">
						Right-click here, then open any first-row submenu chain
					</div>
				</template>
			</ContextMenu>
		`,
	}),
	args: {
		items: alignedSubmenuItems,
	},
};

export const HeightConstrained: Story = {
	name: 'Height Constrained',
	render: (args) => ({
		components: { ContextMenu },
		setup() {
			const panelStyle =
				'.context-menu-height-constrained { max-height: var(--spacing--5xl) !important; }';
			return { args, logSelect, panelStyle };
		},
		template: `
			<div>
				<component :is="'style'">{{ panelStyle }}</component>
				<ContextMenu
					:items="args.items"
					content-class="context-menu-height-constrained"
					@select="logSelect"
				>
					<template #trigger>
						<div class="context-menu-story-trigger">
							Right-click here. Scroll to the last item.
						</div>
					</template>
				</ContextMenu>
			</div>
		`,
	}),
	args: {
		items: heightConstrainedItems,
	},
};

export const CustomWidth: Story = {
	name: 'Custom Width',
	render: (args) => ({
		components: { ContextMenu },
		setup() {
			const customWidthStyle = '.context-menu-custom-width { --context-menu--width: 20rem; }';
			return { args, logSelect, customWidthStyle };
		},
		template: `
			<div>
				<component :is="'style'">{{ customWidthStyle }}</component>
				<ContextMenu
					:items="args.items"
					content-class="context-menu-custom-width"
					@select="logSelect"
				>
					<template #trigger>
						<div class="context-menu-story-trigger">
							Right-click here. Panel is 20rem wide.
						</div>
					</template>
				</ContextMenu>
			</div>
		`,
	}),
	args: {
		items: customWidthItems,
	},
};

export const Loading: Story = {
	render: (args) => renderMenuStory(args),
	args: {
		items: exampleItems,
		loading: true,
		loadingItemCount: 10,
	},
};

export const Disabled: Story = {
	render: (args) => ({
		components: { ContextMenu },
		setup() {
			return { args };
		},
		template: `
			<ContextMenu :items="args.items" disabled>
				<template #trigger>
					<div class="context-menu-story-trigger">
						Right-click is disabled
					</div>
				</template>
			</ContextMenu>
		`,
	}),
	args: {
		items: exampleItems,
	},
};

export const DisabledItems: Story = {
	render: (args) => ({
		components: { ContextMenu },
		setup() {
			return { args, logSelect };
		},
		template: `
			<ContextMenu :items="args.items" @select="logSelect">
				<template #trigger>
					<div class="context-menu-story-trigger">
						Right-click here
					</div>
				</template>
			</ContextMenu>
		`,
	}),
	args: {
		items: [
			{
				type: 'group',
				id: 'actions',
				children: [
					{ type: 'item', id: 'edit', label: 'Edit', icon: { type: 'icon', value: 'pen' } },
					{
						type: 'item',
						id: 'duplicate',
						label: 'Duplicate',
						icon: { type: 'icon', value: 'copy' },
						disabled: true,
					},
					{
						type: 'item',
						id: 'delete',
						label: 'Delete',
						icon: { type: 'icon', value: 'trash' },
						variant: 'destructive',
					},
				],
			},
		] satisfies Array<ContextMenuNode<string>>,
	},
};

export const LazySubmenu: Story = {
	render: () => ({
		components: { ContextMenu, N8nAvatar, N8nIcon },
		setup() {
			const users = ref<Array<{ type: 'item'; id: string; label: string }>>([]);
			const usersLoading = ref(true);

			const items = computed<Array<ContextMenuNode<string>>>(() => [
				{
					type: 'submenu',
					id: 'assign',
					label: 'Assign to…',
					icon: { type: 'icon', value: 'user' },
					loading: usersLoading.value,
					loadingItemCount: 4,
					children: users.value,
				},
			]);

			function isUserItem(item: ContextMenuNode<string>) {
				return item.type === 'item' && item.id.startsWith('user-');
			}

			function onSubmenuToggle(id: string, open: boolean) {
				if (id !== 'assign' || !open || !usersLoading.value) return;
				window.setTimeout(() => {
					users.value = [
						{ type: 'item', id: 'user-ada', label: 'Ada Lovelace' },
						{ type: 'item', id: 'user-grace', label: 'Grace Hopper' },
						{ type: 'item', id: 'user-alan', label: 'Alan Turing' },
					];
					usersLoading.value = false;
				}, 800);
			}

			return { items, onSubmenuToggle, logSelect, isUserItem, splitPersonName, leadingIconColor };
		},
		template: `
			<ContextMenu :items="items" @select="logSelect" @submenu:toggle="onSubmenuToggle">
				<template #trigger>
					<div class="context-menu-story-trigger">
						Right-click here, then open Assign to…
					</div>
				</template>
				<template #item-leading="{ item, ui }">
					<N8nAvatar
						v-if="isUserItem(item)"
						:class="ui.class"
						size="xsmall"
						v-bind="splitPersonName(item.label)"
					/>
					<N8nIcon
						v-else-if="item.icon?.type === 'icon'"
						:icon="item.icon.value"
						:class="ui.class"
						size="large"
						:color="leadingIconColor(item)"
					/>
				</template>
			</ContextMenu>
		`,
	}),
	args: {
		items: exampleItems,
	},
};
