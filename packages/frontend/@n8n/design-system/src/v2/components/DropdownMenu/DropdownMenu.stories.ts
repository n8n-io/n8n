/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, computed } from 'vue';

import N8nBadge from '@n8n/design-system/components/N8nBadge/Badge.vue';
import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import N8nKeyboardShortcut from '@n8n/design-system/components/N8nKeyboardShortcut/N8nKeyboardShortcut.vue';

import type { DropdownMenuItemProps } from './DropdownMenu.types';
import DropdownMenu from './DropdownMenu.vue';
import { tr } from 'element-plus/es/locale';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

const meta = {
	title: 'Components v2/DropdownMenu',
	component: DropdownMenu,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies GenericMeta<typeof DropdownMenu<string>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu :items="args.items" @select="handleSelect" />
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'tags', label: 'Tags', icon: 'tags' },
			{ id: 'credentials', label: 'Credentials', icon: 'lock' },
			{ id: 'variables', label: 'Variables', icon: 'variable' },
			{ id: 'executions', label: 'Executions', icon: 'list' },
			{ id: 'created', label: 'Created', icon: 'calendar' },
			{ id: 'updated', label: 'Updated', icon: 'calendar' },
			{ id: 'dataTables', label: 'Data tables', icon: 'table' },
			{ id: 'settings', label: 'Settings', icon: 'settings' },
			{ id: 'thrash', label: 'Delete', icon: 'trash-2', divided: true },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const WithCustomTrigger: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu, N8nButton },
		setup() {
			const isOpen = ref(false);
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, isOpen, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu
				v-model="isOpen"
				:items="args.items"
				placement="bottom-end"
				@select="handleSelect"
			>
				<template #trigger>
					<N8nButton>
						Account Menu
					</N8nButton>
				</template>
			</DropdownMenu>
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'profile', label: 'Profile', icon: 'user' },
			{ id: 'settings', label: 'Settings', icon: 'cog' },
			{ id: 'logout', label: 'Sign out', icon: 'sign-out-alt', divided: true },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const WithCheckedItems: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu :items="args.items" @select="handleSelect" />
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'option1', label: 'Option 1', checked: true },
			{ id: 'option2', label: 'Option 2' },
			{ id: 'option3', label: 'Option 3' },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const WithDisabledItems: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu :items="args.items" @select="handleSelect" />
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'edit', label: 'Edit', icon: 'pen' },
			{ id: 'duplicate', label: 'Duplicate', icon: 'copy', disabled: true },
			{ id: 'delete', label: 'Delete', icon: 'trash' },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const WithBadgesAndShortcuts: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu, N8nBadge, N8nKeyboardShortcut },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu :items="args.items" @select="handleSelect">
				<template #item-trailing="{ item, ui }">
					<N8nKeyboardShortcut
						v-if="item.id === 'save'"
						:keys="['S']"
						shortcut-type="cmd"
						:class="ui.class"
					/>
					<N8nBadge
						v-if="item.id === 'share'"
						theme="success"
						bold
						:class="ui.class"
					>
						New
					</N8nBadge>
					<N8nBadge
						v-if="item.id === 'pro'"
						theme="primary"
						:class="ui.class"
					>
						PRO
					</N8nBadge>
				</template>
			</DropdownMenu>
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'save', label: 'Save', icon: 'save' },
			{ id: 'share', label: 'Share', icon: 'share-alt' },
			{ id: 'pro', label: 'Pro Feature', icon: 'star', disabled: true },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const LoadingState: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			return { args };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu
				:items="args.items"
				:loading="args.loading"
				:loading-item-count="args.loadingItemCount"
			/>
		</div>
		`,
	}),
	args: {
		items: [] as Array<DropdownMenuItemProps<string>>,
		loading: true,
		loadingItemCount: 5,
	},
};

export const Placements: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu, N8nButton },
		setup() {
			const placements = [
				'top',
				'top-start',
				'top-end',
				'bottom',
				'bottom-start',
				'bottom-end',
				'left',
				'right',
			];
			return { args, placements };
		},
		template: `
		<div style="padding: 100px; display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
			<DropdownMenu
				v-for="placement in placements"
				:key="placement"
				:items="args.items"
				:placement="placement"
			>
				<template #trigger>
					<N8nButton size="small">
						{{ placement }}
					</N8nButton>
				</template>
			</DropdownMenu>
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'option1', label: 'Option 1' },
			{ id: 'option2', label: 'Option 2' },
			{ id: 'option3', label: 'Option 3' },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const ControlledState: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu, N8nButton },
		setup() {
			const isOpen = ref(false);
			const toggle = () => {
				isOpen.value = !isOpen.value;
			};
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
				isOpen.value = false;
			};
			return { args, isOpen, toggle, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<div style="margin-bottom: 16px;">
				<N8nButton @click="toggle">
					{{ isOpen ? 'Close' : 'Open' }} Dropdown
				</N8nButton>
			</div>
			<DropdownMenu
				v-model="isOpen"
				:items="args.items"
				@select="handleSelect"
			/>
			<p style="margin-top: 16px;">Dropdown is {{ isOpen ? 'open' : 'closed' }}</p>
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'option1', label: 'Option 1' },
			{ id: 'option2', label: 'Option 2' },
			{ id: 'option3', label: 'Option 3' },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const NestedMenu: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu
				:items="args.items"
				placement="bottom-start"
				activator-icon="plus"
				@select="handleSelect"
			/>
		</div>
		`,
	}),
	args: {
		items: [
			{
				id: 'workflow',
				label: 'Workflow',
				icon: 'tags',
				children: [
					{ id: 'personal', label: 'Personal' },
					{ id: 'adore', label: 'Adore' },
					{ id: 'assistant', label: 'AI Assistant' },
					{ id: 'cloud', label: 'Cloud' },
					{ id: 'Design', label: 'Design' },
					{ id: 'studies', label: 'Diary studies' },
					{ id: 'evals', label: 'Evaluations workshop', icon: 'layers' },
				],
			},
			{
				id: 'credential',
				label: 'Credential',
				icon: 'lock',
				children: [
					{ id: 'gmail', label: 'Gmail' },
					{ id: 'airtable', label: 'Airtable' },
				],
			},
			{ id: 'project', label: 'Project', icon: 'layers', disabled: true },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const MoreLevels: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu :items="args.items" @select="handleSelect" />
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'new', label: 'New', icon: 'plus' },
			{
				id: 'open',
				label: 'Open',
				icon: 'folder-open',
				children: [
					{ id: 'open-recent', label: 'Recent Files' },
					{ id: 'open-folder', label: 'Open Folder...' },
					{
						id: 'open-workspace',
						label: 'Open Workspace',
						children: [
							{ id: 'workspace-1', label: 'Project Alpha' },
							{ id: 'workspace-2', label: 'Project Beta' },
							{ id: 'workspace-3', label: 'Project Gamma' },
						],
					},
				],
			},
			{ id: 'save', label: 'Save', icon: 'save' },
			{
				id: 'export',
				label: 'Export As',
				icon: 'download',
				divided: true,
				children: [
					{ id: 'export-pdf', label: 'PDF', icon: 'file' },
					{ id: 'export-png', label: 'PNG', icon: 'file' },
					{ id: 'export-json', label: 'JSON', icon: 'file' },
				],
			},
			{ id: 'settings', label: 'Settings', icon: 'cog', divided: true },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const SubMenuLoading: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu :items="args.items" @select="handleSelect" />
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'new', label: 'New', icon: 'plus' },
			{
				id: 'open',
				label: 'Open Recent',
				icon: 'folder-open',
				loading: true,
				loadingItemCount: 4,
			},
			{ id: 'save', label: 'Save', icon: 'save' },
			{
				id: 'export',
				label: 'Export As',
				icon: 'download',
				children: [
					{ id: 'export-pdf', label: 'PDF' },
					{
						id: 'export-image',
						label: 'Image',
						loading: true,
						loadingItemCount: 2,
					},
				],
			},
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const Searchable: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const allItems: Array<DropdownMenuItemProps<string>> = [
				{ id: 'tags', label: 'Tags', icon: 'tags' },
				{ id: 'credentials', label: 'Credentials', icon: 'lock' },
				{ id: 'variables', label: 'Variables', icon: 'variable' },
				{ id: 'executions', label: 'Executions', icon: 'list' },
				{ id: 'created', label: 'Created', icon: 'calendar' },
				{ id: 'updated', label: 'Updated', icon: 'calendar' },
				{ id: 'dataTables', label: 'Data tables', icon: 'table' },
				{ id: 'settings', label: 'Settings', icon: 'settings' },
			];

			const searchTerm = ref('');

			const filteredItems = computed(() => {
				if (!searchTerm.value) return allItems;
				return allItems.filter((item) =>
					item.label.toLowerCase().includes(searchTerm.value.toLowerCase()),
				);
			});

			const handleSearch = (term: string) => {
				console.log('Search term (debounced):', term);
				searchTerm.value = term;
			};

			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};

			return { args, filteredItems, handleSearch, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu
				:items="filteredItems"
				searchable
				:search-placeholder="args.searchPlaceholder"
				:search-debounce="args.searchDebounce"
				:show-search-icon="false"
				@search="handleSearch"
				@select="handleSelect"
			/>
		</div>
		`,
	}),
	args: {
		items: [] as Array<DropdownMenuItemProps<string>>,
		searchPlaceholder: 'Search items',
		searchDebounce: 300,
	},
};

export const SearchableWithSubmenus: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const allItems: Array<DropdownMenuItemProps<string>> = [
				{
					id: 'fruits',
					label: 'Fruits',
					icon: 'folder',
					children: [
						{ id: 'apple', label: 'Apple' },
						{ id: 'banana', label: 'Banana' },
						{ id: 'cherry', label: 'Cherry' },
					],
				},
				{
					id: 'vegetables',
					label: 'Vegetables',
					icon: 'folder',
					children: [
						{ id: 'carrot', label: 'Carrot' },
						{ id: 'broccoli', label: 'Broccoli' },
						{ id: 'spinach', label: 'Spinach' },
					],
				},
				{
					id: 'dairy',
					label: 'Dairy',
					icon: 'folder',
					children: [
						{ id: 'milk', label: 'Milk' },
						{ id: 'cheese', label: 'Cheese' },
						{ id: 'yogurt', label: 'Yogurt' },
					],
				},
				{ id: 'water', label: 'Water', divided: true },
			];

			const searchTerm = ref('');

			// Recursive filter function that searches through nested items
			const filterItems = (
				items: Array<DropdownMenuItemProps<string>>,
				term: string,
			): Array<DropdownMenuItemProps<string>> => {
				if (!term) return items;

				return items.reduce<Array<DropdownMenuItemProps<string>>>((acc, item) => {
					const labelMatches = item.label.toLowerCase().includes(term.toLowerCase());

					if (item.children) {
						const filteredChildren = filterItems(item.children, term);
						// Include parent if it matches OR if any children match
						if (labelMatches || filteredChildren.length > 0) {
							acc.push({
								...item,
								children: filteredChildren.length > 0 ? filteredChildren : item.children,
							});
						}
					} else if (labelMatches) {
						acc.push(item);
					}

					return acc;
				}, []);
			};

			const filteredItems = computed(() => filterItems(allItems, searchTerm.value));

			const handleSearch = (term: string) => {
				console.log('Search term (debounced):', term);
				searchTerm.value = term;
			};

			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};

			return { args, filteredItems, handleSearch, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu
				:items="filteredItems"
				searchable
				search-placeholder="Search all items..."
				:search-debounce="200"
				@search="handleSearch"
				@select="handleSelect"
			/>
		</div>
		`,
	}),
	args: {
		items: [] as Array<DropdownMenuItemProps<string>>,
	},
};

export const EmptyState: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			return { args };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu :items="args.items" />
		</div>
		`,
	}),
	args: {
		items: [] as Array<DropdownMenuItemProps<string>>,
	},
};

export const CustomEmptyState: Story = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			return { args };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu :items="args.items">
				<template #empty>
					<div style="padding: 24px; text-align: center; color: var(--color--text--tint-1);">
						<div style="font-size: 12px; margin-bottom: 8px;">🔍</div>
						<div>Nothing here yet</div>
					</div>
				</template>
			</DropdownMenu>
		</div>
		`,
	}),
	args: {
		items: [] as Array<DropdownMenuItemProps<string>>,
	},
};
