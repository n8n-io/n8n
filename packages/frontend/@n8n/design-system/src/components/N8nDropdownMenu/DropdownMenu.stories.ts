/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';

import N8nButton from '../N8nButton/Button.vue';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nKeyboardShortcut from '../N8nKeyboardShortcut/N8nKeyboardShortcut.vue';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';
import { useDropdownSearch } from './composables/useDropdownSearch';
import type { DropdownMenuItemProps } from './DropdownMenu.types';
import DropdownMenu from './DropdownMenu.vue';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

type MenuItemData = {
	shortcut?: string[];
	shortcutType?: 'cmd' | 'ctrl' | 'alt' | 'shift';
	tooltip?: string;
};

type MenuItem = DropdownMenuItemProps<string, MenuItemData>;

const meta = {
	title: 'Core/Dropdown Menu',
	component: DropdownMenu,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies GenericMeta<typeof DropdownMenu<string>>;

export default meta;

type Story = StoryObj<typeof meta>;

function logSelection(action: string) {
	console.log('Selected:', action);
}

export const Default: Story = {
	render: function render(args) {
		return {
			components: { DropdownMenu, N8nIcon, N8nKeyboardShortcut, N8nTooltip },
			setup() {
				return { args, logSelection };
			},
			template: `
				<div style="padding: var(--spacing--xl);">
					<DropdownMenu :items="args.items" placement="bottom-start" @select="logSelection">
						<template #item-label="{ item, ui }">
							<N8nTooltip
								v-if="item.data?.tooltip"
								:content="item.data.tooltip"
								placement="right"
								teleported
								as-child
							>
								<span :class="ui.class">{{ item.label }}</span>
							</N8nTooltip>
							<span v-else :class="ui.class">{{ item.label }}</span>
						</template>
						<template #item-trailing="{ item, ui }">
							<N8nKeyboardShortcut
								v-if="item.data?.shortcut"
								:keys="item.data.shortcut"
								:shortcut-type="item.data.shortcutType"
								:class="ui.class"
							/>
							<N8nTooltip
								v-else-if="item.id === 'deactivate'"
								content="Stops production executions until the workflow is activated again"
								placement="right"
								teleported
								as-child
							>
								<N8nIcon icon="info" size="medium" :class="ui.class" />
							</N8nTooltip>
						</template>
					</DropdownMenu>
				</div>
			`,
		};
	},
	args: {
		items: [
			{
				id: 'rename',
				label: 'Rename workflow',
				icon: { type: 'icon', value: 'pen' },
				data: { shortcut: ['F2'] },
			},
			{
				id: 'duplicate',
				label: 'Duplicate workflow',
				icon: { type: 'icon', value: 'copy' },
				data: { shortcut: ['D'], shortcutType: 'cmd' },
			},
			{
				id: 'download',
				label: 'Download',
				icon: { type: 'icon', value: 'download' },
				data: { tooltip: 'Download this workflow as a JSON file' },
			},
			{
				id: 'deactivate',
				label: 'Deactivate',
				icon: { type: 'icon', value: 'pause' },
				data: {},
			},
			{
				id: 'delete',
				label: 'Delete workflow',
				icon: { type: 'icon', value: 'trash-2' },
				divided: true,
				data: { shortcut: ['Backspace'], shortcutType: 'cmd' },
			},
		] as MenuItem[],
	},
};

export const CustomTrigger: Story = {
	render: function render(args) {
		return {
			components: { DropdownMenu, N8nButton },
			setup() {
				return { args, logSelection };
			},
			template: `
				<div style="padding: var(--spacing--xl);">
					<DropdownMenu :items="args.items" placement="bottom-end" @select="logSelection">
						<template #trigger>
							<N8nButton icon="plus">Create new</N8nButton>
						</template>
					</DropdownMenu>
				</div>
			`,
		};
	},
	args: {
		items: [
			{ id: 'workflow', label: 'Workflow', icon: { type: 'icon', value: 'workflow' } },
			{ id: 'credential', label: 'Credential', icon: { type: 'icon', value: 'lock' } },
			{ id: 'project', label: 'Project', icon: { type: 'icon', value: 'folder' } },
		] as MenuItem[],
	},
};

export const CheckedItems: Story = {
	render: function render(args) {
		return {
			components: { DropdownMenu },
			setup() {
				return { args, logSelection };
			},
			template: `
				<div style="padding: var(--spacing--xl);">
					<DropdownMenu :items="args.items" placement="bottom-start" @select="logSelection" />
				</div>
			`,
		};
	},
	args: {
		items: [
			{ id: 'name', label: 'Workflow name', checked: true },
			{ id: 'status', label: 'Status', checked: true },
			{ id: 'created', label: 'Date created' },
			{ id: 'updated', label: 'Date updated', checked: true },
			{ id: 'owner', label: 'Owner', checked: true, disabled: true },
		] as MenuItem[],
	},
};

export const NestedMenu: Story = {
	render: function render(args) {
		return {
			components: { DropdownMenu },
			setup() {
				return { args, logSelection };
			},
			template: `
				<div style="padding: var(--spacing--xl);">
					<DropdownMenu :items="args.items" placement="bottom-start" @select="logSelection" />
				</div>
			`,
		};
	},
	args: {
		items: [
			{ id: 'personal', label: 'Move to Personal', icon: { type: 'icon', value: 'user' } },
			{
				id: 'projects',
				label: 'Move to project',
				icon: { type: 'icon', value: 'folder' },
				children: [
					{ id: 'operations', label: 'Operations', icon: { type: 'emoji', value: '⚙️' } },
					{
						id: 'product',
						label: 'Product',
						icon: { type: 'emoji', value: '🧩' },
						children: [
							{ id: 'product-design', label: 'Design' },
							{ id: 'product-engineering', label: 'Engineering' },
							{
								id: 'product-research',
								label: 'Research',
								children: [
									{ id: 'research-interviews', label: 'Customer interviews' },
									{ id: 'research-evaluations', label: 'Workflow evaluations' },
								],
							},
						],
					},
					{ id: 'marketing', label: 'Marketing', icon: { type: 'emoji', value: '📣' } },
				],
			},
		] as MenuItem[],
	},
};

export const Searchable: Story = {
	render: function render() {
		return {
			components: { DropdownMenu },
			setup() {
				const allItems: MenuItem[] = [
					{
						id: 'communication',
						label: 'Communication',
						icon: { type: 'icon', value: 'message-circle' },
						children: [
							{ id: 'slack', label: 'Slack' },
							{ id: 'gmail', label: 'Gmail' },
							{ id: 'microsoft-teams', label: 'Microsoft Teams' },
						],
					},
					{
						id: 'databases',
						label: 'Databases',
						icon: { type: 'icon', value: 'database' },
						children: [
							{ id: 'postgres', label: 'Postgres' },
							{ id: 'mysql', label: 'MySQL' },
							{ id: 'mongodb', label: 'MongoDB' },
						],
					},
					{ id: 'http-request', label: 'HTTP Request', icon: { type: 'icon', value: 'globe' } },
				];
				function mapSearchResult(item: MenuItem, path: MenuItem[]): MenuItem {
					return {
						...item,
						label: path
							.map(function getPathLabel(pathItem) {
								return pathItem.label;
							})
							.join(' › '),
						divided: false,
					};
				}

				const {
					search,
					filteredItems: searchResults,
					handleSearch,
				} = useDropdownSearch(allItems, {
					flatList: true,
					mapResult: mapSearchResult,
				});
				const filteredItems = computed<MenuItem[]>(function getFilteredItems() {
					return search.value.trim() ? searchResults.value : allItems;
				});

				return { filteredItems, handleSearch, logSelection };
			},
			template: `
				<div style="padding: var(--spacing--xl);">
					<DropdownMenu
						:items="filteredItems"
						searchable
						search-placeholder="Search nodes"
						placement="bottom-start"
						@search="handleSearch"
						@select="logSelection"
					/>
				</div>
			`,
		};
	},
	args: {
		items: [] as MenuItem[],
	},
};

export const LongList: Story = {
	render: function render() {
		return {
			components: { DropdownMenu },
			setup() {
				const recentWorkflows = Array.from({ length: 24 }, function createWorkflow(_, index) {
					return {
						id: `recent-workflow-${index + 1}`,
						label: `Recent workflow ${index + 1}`,
					};
				});
				const mainItems = Array.from({ length: 18 }, function createProject(_, index) {
					return {
						id: `project-${index + 1}`,
						label: `Project ${index + 1}`,
						icon: { type: 'icon' as const, value: 'folder' },
					};
				});
				const items = computed<MenuItem[]>(function getItems() {
					return [
						{
							id: 'recent-workflows',
							label: 'Recent workflows',
							icon: { type: 'icon', value: 'clock' },
							children: recentWorkflows,
						},
						...mainItems.slice(0, 9),
						{
							id: 'shared-projects',
							label: 'Shared projects',
							icon: { type: 'icon', value: 'users' },
							children: [
								{ id: 'shared-marketing', label: 'Marketing operations' },
								{ id: 'shared-sales', label: 'Sales automation' },
								{ id: 'shared-support', label: 'Customer support' },
							],
						},
						...mainItems.slice(9),
					];
				});

				return { items, logSelection };
			},
			template: `
				<div style="padding: var(--spacing--xl);">
					<DropdownMenu
						:items="items"
						max-height="320px"
						sub-menu-max-height="320px"
						placement="bottom-start"
						@select="logSelection"
					/>
				</div>
			`,
		};
	},
	args: {
		items: [] as MenuItem[],
	},
};

export const EmptyState: Story = {
	render: function render(args) {
		return {
			components: { DropdownMenu },
			setup() {
				return { args };
			},
			template: `
				<div style="padding: var(--spacing--xl);">
					<DropdownMenu
						:items="args.items"
						empty-text="No workflows yet. Create a workflow to see it here."
						placement="bottom-start"
					/>
				</div>
			`,
		};
	},
	args: {
		items: [] as MenuItem[],
	},
};
