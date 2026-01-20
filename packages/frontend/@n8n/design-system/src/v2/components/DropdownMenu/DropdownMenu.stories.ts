/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, computed } from 'vue';

import N8nBadge from '@n8n/design-system/components/N8nBadge/Badge.vue';
import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import N8nKeyboardShortcut from '@n8n/design-system/components/N8nKeyboardShortcut/N8nKeyboardShortcut.vue';
import N8nCheckbox from '@n8n/design-system/v2/components/Checkbox/Checkbox.vue';

import type { DropdownMenuItemProps } from './DropdownMenu.types';
import DropdownMenu from './DropdownMenu.vue';

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
			{ id: 'tags', label: 'Tags', icon: { type: 'icon', value: 'tags' } },
			{ id: 'credentials', label: 'Credentials', icon: { type: 'icon', value: 'lock' } },
			{ id: 'variables', label: 'Variables', icon: { type: 'icon', value: 'variable' } },
			{ id: 'executions', label: 'Executions', icon: { type: 'icon', value: 'list' } },
			{ id: 'created', label: 'Created', icon: { type: 'icon', value: 'calendar' } },
			{ id: 'updated', label: 'Updated', icon: { type: 'icon', value: 'calendar' } },
			{ id: 'dataTables', label: 'Data tables', icon: { type: 'icon', value: 'table' } },
			{ id: 'settings', label: 'Settings', icon: { type: 'icon', value: 'settings' } },
			{ id: 'thrash', label: 'Delete', icon: { type: 'icon', value: 'trash-2' }, divided: true },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const WithCustomTrigger: Story = {
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
			{ id: 'profile', label: 'Profile', icon: { type: 'icon', value: 'user' } },
			{ id: 'settings', label: 'Settings', icon: { type: 'icon', value: 'cog' } },
			{
				id: 'logout',
				label: 'Sign out',
				icon: { type: 'icon', value: 'sign-out-alt' },
				divided: true,
			},
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const EmojiActivator: Story = {
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
				:activator-icon="{ type: 'emoji', value: '✨' }"
				@select="handleSelect"
			/>
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'option1', label: 'Option 1' },
			{ id: 'option2', label: 'Option 2' },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const WithCheckedItems: Story = {
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
			{ id: 'edit', label: 'Edit', icon: { type: 'icon', value: 'pen' } },
			{
				id: 'duplicate',
				label: 'Duplicate',
				icon: { type: 'icon', value: 'copy' },
				disabled: true,
			},
			{ id: 'delete', label: 'Delete', icon: { type: 'icon', value: 'trash' } },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const WithBadgesAndShortcuts: Story = {
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
			<p>Example of using custom trailing slots to render badges and keyboard shortcuts for each item.</p>
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
			{ id: 'save', label: 'Save', icon: { type: 'icon', value: 'save' } },
			{ id: 'share', label: 'Share', icon: { type: 'icon', value: 'share-alt' } },
			{ id: 'pro', label: 'Pro Feature', icon: { type: 'icon', value: 'star' }, disabled: true },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const WithCustomLeadingSlot: Story = {
	render: (args) => ({
		components: { DropdownMenu, N8nCheckbox },
		setup() {
			const checkedItems = ref<Set<string>>(new Set(['notifications']));

			const toggleItem = (id: string) => {
				if (checkedItems.value.has(id)) {
					checkedItems.value.delete(id);
				} else {
					checkedItems.value.add(id);
				}
				// Trigger reactivity
				checkedItems.value = new Set(checkedItems.value);
			};

			const isChecked = (id: string) => checkedItems.value.has(id);

			const handleSelect = (action: string) => {
				console.log('Selected:', action);
				toggleItem(action);
			};

			return { args, handleSelect, isChecked };
		},
		template: `
		<div style="padding: 40px;">
			<p>Example of using a custom leading slot to render checkboxes for each item.</p>
			<DropdownMenu :items="args.items" @select="handleSelect">
				<template #item-leading="{ item, ui }">
					<N8nCheckbox
						:model-value="isChecked(item.id)"
						:class="ui.class"
						@click.stop
						@change="handleSelect(item.id)"
					/>
				</template>
			</DropdownMenu>
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'notifications', label: 'Enable notifications' },
			{ id: 'sounds', label: 'Play sounds' },
			{ id: 'desktop', label: 'Desktop alerts' },
			{ id: 'email', label: 'Email digests', divided: true },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const LoadingState: Story = {
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
		<div style="padding: 200px; display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
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
			<p style="margin-bottom: 16px; user-select: none;">Dropdown is {{ isOpen ? 'open' : 'closed' }}</p>
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
				:activator-icon="{ type: 'icon', value: 'plus' }"
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
				icon: { type: 'icon', value: 'tags' },
				children: [
					{ id: 'personal', label: 'Personal', icon: { type: 'icon', value: 'user' } },
					{ id: 'adore', label: 'Adore', icon: { type: 'emoji', value: '😍' } },
					{ id: 'assistant', label: 'AI Assistant', icon: { type: 'emoji', value: '🔮' } },
					{ id: 'cloud', label: 'Cloud', icon: { type: 'emoji', value: '🌏' } },
					{ id: 'Design', label: 'Design', icon: { type: 'emoji', value: '🎨' } },
					{ id: 'studies', label: 'Diary studies', icon: { type: 'emoji', value: '📖' } },
					{ id: 'evals', label: 'Evaluations workshop', icon: { type: 'icon', value: 'layers' } },
				],
			},
			{
				id: 'credential',
				label: 'Credential',
				icon: { type: 'icon', value: 'lock' },
				children: [
					{ id: 'gmail', label: 'Gmail', icon: { type: 'icon', value: 'mail' } },
					{ id: 'airtable', label: 'Airtable', icon: { type: 'icon', value: 'table' } },
				],
			},
			{ id: 'project', label: 'Project', icon: { type: 'icon', value: 'layers' }, disabled: true },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const MoreLevels: Story = {
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
			{ id: 'new', label: 'New', icon: { type: 'icon', value: 'plus' } },
			{
				id: 'open',
				label: 'Open',
				icon: { type: 'icon', value: 'folder-open' },
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
			{ id: 'save', label: 'Save', icon: { type: 'icon', value: 'save' } },
			{
				id: 'export',
				label: 'Export As',
				icon: { type: 'icon', value: 'download' },
				divided: true,
				children: [
					{ id: 'export-pdf', label: 'PDF', icon: { type: 'icon', value: 'file' } },
					{ id: 'export-png', label: 'PNG', icon: { type: 'icon', value: 'file' } },
					{ id: 'export-json', label: 'JSON', icon: { type: 'icon', value: 'file' } },
				],
			},
			{ id: 'settings', label: 'Settings', icon: { type: 'icon', value: 'cog' }, divided: true },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const SubMenuLoading: Story = {
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
			{ id: 'new', label: 'New', icon: { type: 'icon', value: 'plus' } },
			{
				id: 'open',
				label: 'Open Recent',
				icon: { type: 'icon', value: 'folder-open' },
				loading: true,
				loadingItemCount: 4,
			},
			{ id: 'save', label: 'Save', icon: { type: 'icon', value: 'save' } },
			{
				id: 'export',
				label: 'Export As',
				icon: { type: 'icon', value: 'download' },
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

export const SearchableRoot: Story = {
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const allItems: Array<DropdownMenuItemProps<string>> = [
				{ id: 'tags', label: 'Tags', icon: { type: 'icon', value: 'tags' } },
				{ id: 'credentials', label: 'Credentials', icon: { type: 'icon', value: 'lock' } },
				{ id: 'variables', label: 'Variables', icon: { type: 'icon', value: 'variable' } },
				{ id: 'executions', label: 'Executions', icon: { type: 'icon', value: 'list' } },
				{ id: 'created', label: 'Created', icon: { type: 'icon', value: 'calendar' } },
				{ id: 'updated', label: 'Updated', icon: { type: 'icon', value: 'calendar' } },
				{ id: 'dataTables', label: 'Data tables', icon: { type: 'icon', value: 'table' } },
				{ id: 'settings', label: 'Settings', icon: { type: 'icon', value: 'settings' } },
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

export const SearchableRootWithSubmenus: Story = {
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const allItems: Array<DropdownMenuItemProps<string>> = [
				{
					id: 'fruits',
					label: 'Fruits',
					icon: { type: 'icon', value: 'folder' },
					children: [
						{ id: 'apple', label: 'Apple' },
						{ id: 'banana', label: 'Banana' },
						{ id: 'cherry', label: 'Cherry' },
					],
				},
				{
					id: 'vegetables',
					label: 'Vegetables',
					icon: { type: 'icon', value: 'folder' },
					children: [
						{ id: 'carrot', label: 'Carrot' },
						{ id: 'broccoli', label: 'Broccoli' },
						{ id: 'spinach', label: 'Spinach' },
					],
				},
				{
					id: 'dairy',
					label: 'Dairy',
					icon: { type: 'icon', value: 'folder' },
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

export const SearchableSubmenu: Story = {
	render: () => ({
		components: { DropdownMenu },
		setup() {
			const allProjects = [
				{ id: 'personal', label: 'Personal', icon: { type: 'icon', value: 'user' } },
				{ id: 'adore', label: 'Adore', icon: { type: 'emoji', value: '😍' } },
				{ id: 'assistant', label: 'AI Assistant', icon: { type: 'emoji', value: '🔮' } },
				{ id: 'cloud', label: 'Cloud', icon: { type: 'emoji', value: '🌏' } },
				{ id: 'Design', label: 'Design', icon: { type: 'emoji', value: '🎨' } },
				{ id: 'studies', label: 'Diary studies', icon: { type: 'emoji', value: '📖' } },
				{ id: 'evals', label: 'Evaluations workshop', icon: { type: 'icon', value: 'layers' } },
			];

			const filteredProjects = ref(allProjects);

			const handleSearch = (term: string, itemId?: string) => {
				console.log('Search event:', { term, itemId });
				if (itemId === 'workflow') {
					filteredProjects.value = term
						? allProjects.filter((tag) => tag.label.toLowerCase().includes(term.toLowerCase()))
						: allProjects;
				}
			};

			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};

			const items = computed(() => [
				{
					id: 'workflow',
					label: 'Workflow',
					icon: { type: 'icon', value: 'tags' },
					searchable: true,
					searchPlaceholder: 'Search projects',
					children: filteredProjects.value,
				},
				{
					id: 'credential',
					label: 'Credential',
					icon: { type: 'icon', value: 'lock' },
					children: [
						{ id: 'gmail', label: 'Gmail', icon: { type: 'icon', value: 'mail' } },
						{ id: 'airtable', label: 'Airtable', icon: { type: 'icon', value: 'table' } },
					],
				},
				{
					id: 'project',
					label: 'Project',
					icon: { type: 'icon', value: 'layers' },
					disabled: true,
				},
			]);

			return { items, handleSearch, handleSelect };
		},
		template: `
		<div style="padding: 40px;">
			<DropdownMenu
				:items="items"
				:activator-icon="{ type: 'icon', value: 'plus' }"
				placement="bottom-start"
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

export const LazyLoadingSubmenu: Story = {
	render: () => ({
		components: { DropdownMenu },
		setup() {
			// Define all possible children upfront (simulates API response)
			const allRecentFiles = [
				{ id: 'doc1', label: 'Project Proposal.docx' },
				{ id: 'doc2', label: 'Meeting Notes.md' },
				{ id: 'doc3', label: 'Budget 2024.xlsx' },
				{ id: 'doc4', label: 'Presentation.pptx' },
			];

			const allSharedFiles = [
				{ id: 'shared1', label: 'Team Roadmap' },
				{ id: 'shared2', label: 'Design Assets' },
			];

			// Track loading states - start as true so skeleton shows on first hover
			const recentFilesLoading = ref(true);
			const recentFilesChildren = ref([] as typeof allRecentFiles);

			const sharedLoading = ref(true);
			const sharedChildren = ref([] as typeof allSharedFiles);

			// Simulates fetching recent files from an API
			const fetchRecentFiles = () => {
				console.log('Fetching recent files...');
				setTimeout(() => {
					recentFilesChildren.value = allRecentFiles;
					recentFilesLoading.value = false;
					console.log('Recent files loaded!');
				}, 500);
			};

			// Simulates fetching shared files from an API
			const fetchSharedFiles = () => {
				console.log('Fetching shared files...');
				setTimeout(() => {
					sharedChildren.value = allSharedFiles;
					sharedLoading.value = false;
					console.log('Shared files loaded!');
				}, 500);
			};

			// Reset state when dropdown closes
			const handleOpenChange = (open: boolean) => {
				if (!open) {
					// Reset state when dropdown closes so loading shows again next time
					recentFilesLoading.value = true;
					recentFilesChildren.value = [];
					sharedLoading.value = true;
					sharedChildren.value = [];
				}
			};

			// Fetch data when specific submenu opens
			const handleSubmenuToggle = (itemId: string, open: boolean) => {
				console.log('Submenu toggle:', itemId, open);
				if (!open) return;

				if (itemId === 'recent' && recentFilesLoading.value) {
					fetchRecentFiles();
				} else if (itemId === 'shared' && sharedLoading.value) {
					fetchSharedFiles();
				}
			};

			const items = computed(() => [
				{ id: 'new', label: 'New File', icon: { type: 'icon', value: 'plus' } },
				{
					id: 'recent',
					label: 'Recent Files',
					icon: { type: 'icon', value: 'clock' },
					loading: recentFilesLoading.value,
					loadingItemCount: 4,
					children: recentFilesChildren.value,
				},
				{
					id: 'shared',
					label: 'Shared With Me',
					icon: { type: 'icon', value: 'users' },
					loading: sharedLoading.value,
					loadingItemCount: 2,
					children: sharedChildren.value,
				},
				{ id: 'settings', label: 'Settings', icon: { type: 'icon', value: 'cog' }, divided: true },
			]);

			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};

			return { items, handleSelect, handleOpenChange, handleSubmenuToggle };
		},
		template: `
		<div style="padding: 40px;">
			<p style="margin-bottom: 16px; color: var(--color--text--tint-1);">
				Open the dropdown and hover over "Recent Files" or "Shared With Me" to see lazy loading in action.
				Each submenu fetches its content independently when hovered.
			</p>
			<DropdownMenu
				:items="items"
				@select="handleSelect"
				@update:model-value="handleOpenChange"
				@submenu:toggle="handleSubmenuToggle"
			/>
		</div>
		`,
	}),
	args: {
		items: [] as Array<DropdownMenuItemProps<string>>,
	},
};

export const EmptyState: Story = {
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
