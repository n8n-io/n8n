/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import N8nCheckbox from '../../v2/components/Checkbox/Checkbox.vue';
import N8nBadge from '../N8nBadge/Badge.vue';
import N8nButton from '../N8nButton/Button.vue';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nKeyboardShortcut from '../N8nKeyboardShortcut/N8nKeyboardShortcut.vue';
import N8nSpinner from '../N8nSpinner/Spinner.vue';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';
import { useDropdownSearch } from './composables/useDropdownSearch';
import type { DropdownMenuExposed, DropdownMenuItemProps } from './DropdownMenu.types';
import DropdownMenu from './DropdownMenu.vue';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

const meta = {
	title: 'Core/DropdownMenu',
	component: DropdownMenu,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies GenericMeta<typeof DropdownMenu<string>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div>
			<DropdownMenu placement="bottom-start" :items="args.items" @select="handleSelect" />
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

export const WithSectionHeader: Story = {
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div>
			<DropdownMenu placement="bottom-start" :items="args.items" @select="handleSelect" />
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'section-workflows', label: 'Workflows', header: true },
			{ id: 'orders', label: 'Orders workflow', icon: { type: 'icon', value: 'workflow' } },
			{ id: 'invoices', label: 'Invoices workflow', icon: { type: 'icon', value: 'workflow' } },
			{ id: 'customers', label: 'Customers workflow', icon: { type: 'icon', value: 'workflow' } },
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const LongList: Story = {
	render: () => ({
		components: { DropdownMenu },
		setup() {
			const items: Array<DropdownMenuItemProps<string>> = Array.from(
				{ length: 40 },
				(_, index) => ({
					id: `item-${index + 1}`,
					label: `Item ${index + 1}`,
				}),
			);

			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};

			return { items, handleSelect };
		},
		template: `
		<div>
			<DropdownMenu placement="bottom-start" :items="items" @select="handleSelect" />
		</div>
		`,
	}),
	args: {
		items: [] as Array<DropdownMenuItemProps<string>>,
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
		<div>
			<DropdownMenu
				v-model="isOpen"
				:items="args.items"
				placement="bottom-start"
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
		<div>
			<DropdownMenu
				:items="args.items"
				placement="bottom-start"
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
		<div>
			<DropdownMenu placement="bottom-start" :items="args.items" @select="handleSelect" />
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
		<div>
			<DropdownMenu placement="bottom-start" :items="args.items" @select="handleSelect" />
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
		<div>
			<p>Example of using custom trailing slots to render badges and keyboard shortcuts for each item.</p>
			<DropdownMenu placement="bottom-start" :items="args.items" @select="handleSelect">
				<template #item-trailing="{ item, ui }">
					<N8nKeyboardShortcut
						v-if="item.id === 'save'"
						:keys="['S']"
						shortcut-type="cmd"
						:class="ui.class"
					/>
					<N8nBadge
						v-if="item.id === 'share'"
						variant="success"
						:class="ui.class"
					>
						New
					</N8nBadge>
					<N8nBadge
						v-if="item.id === 'pro'"
						variant="primary"
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
		<div>
			<p>Example of using a custom leading slot to render checkboxes for each item.</p>
			<DropdownMenu placement="bottom-start" :items="args.items" @select="handleSelect">
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

const firstNodes: Array<DropdownMenuItemProps<string>> = [
	{ id: 'validate', label: 'Validate order' },
	{ id: 'fulfillment', label: 'Fulfillment' },
];

const laterNodes: Array<DropdownMenuItemProps<string>> = [
	{ id: 'shipment', label: 'Create shipment' },
	{ id: 'notify', label: 'Notify customer' },
	{ id: 'refund', label: 'Refund payment' },
	{ id: 'archive', label: 'Archive order' },
];

const FIRST_RESULTS_MS = 1000;

const SPINNER_ITEM_ID = 'loading-spinner';

type SubmenuLoad = 'ready' | 'skeletons' | 'spinner';

function ordersMenu(
	children: Array<DropdownMenuItemProps<string>> | undefined,
	loading: boolean,
	loadingItemCount = 6,
): Array<DropdownMenuItemProps<string>> {
	return [
		{
			id: 'orders',
			label: 'Orders',
			selectable: true,
			...(loading ? { loading: true, loadingItemCount } : { children }),
		},
	];
}

function allNodes(): Array<DropdownMenuItemProps<string>> {
	return [...firstNodes, ...laterNodes];
}

function useArrivingSubmenu(load: SubmenuLoad) {
	const items = ref<Array<DropdownMenuItemProps<string>>>(idleItems(load));
	const timers: Array<ReturnType<typeof setTimeout>> = [];
	let playing = false;

	function clearTimers(): void {
		for (const timer of timers) clearTimeout(timer);
		timers.length = 0;
	}

	function finish(nextItems: Array<DropdownMenuItemProps<string>>): void {
		items.value = nextItems;
		playing = false;
	}

	function start(): void {
		clearTimers();
		playing = true;
		if (load === 'skeletons') {
			items.value = ordersMenu(undefined, true);
			timers.push(
				setTimeout(() => {
					finish(ordersMenu(allNodes(), false));
				}, FIRST_RESULTS_MS),
			);
			return;
		}
		if (load === 'spinner') {
			items.value = ordersMenu([{ id: SPINNER_ITEM_ID, label: 'Loading', disabled: true }], false);
			timers.push(
				setTimeout(() => {
					finish(ordersMenu(allNodes(), false));
				}, FIRST_RESULTS_MS),
			);
			return;
		}
		items.value = ordersMenu(firstNodes, false);
		timers.push(
			setTimeout(() => {
				finish(ordersMenu(allNodes(), false));
			}, FIRST_RESULTS_MS),
		);
	}

	function onSubmenuToggle(itemId: string, open: boolean): void {
		if (itemId !== 'orders' || !open || playing) return;
		start();
	}

	onBeforeUnmount(clearTimers);

	return { items, onSubmenuToggle };
}

function idleItems(load: SubmenuLoad): Array<DropdownMenuItemProps<string>> {
	if (load === 'skeletons') return ordersMenu(undefined, true);
	if (load === 'spinner') {
		return ordersMenu([{ id: SPINNER_ITEM_ID, label: 'Loading', disabled: true }], false);
	}
	return ordersMenu(firstNodes, false);
}

export const LoadingComparison: Story = {
	render: () => ({
		components: { DropdownMenu, N8nSpinner },
		setup() {
			const ready = useArrivingSubmenu('ready');
			const skeletons = useArrivingSubmenu('skeletons');
			const spinner = useArrivingSubmenu('spinner');

			return {
				readyItems: ready.items,
				skeletonItems: skeletons.items,
				spinnerItems: spinner.items,
				onReadySubmenu: ready.onSubmenuToggle,
				onSkeletonSubmenu: skeletons.onSubmenuToggle,
				onSpinnerSubmenu: spinner.onSubmenuToggle,
				spinnerItemId: SPINNER_ITEM_ID,
			};
		},
		template: `
		<div style="display: flex; flex-wrap: wrap; gap: var(--spacing--xl); align-items: flex-start;">
			<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs); max-width: 22rem;">
				<p style="margin: 0; color: var(--color--text--tint-1);">
					Ready rows. Open Orders. The first nodes show immediately. More nodes appear after 1 second.
				</p>
				<DropdownMenu
					:items="readyItems"
					placement="bottom-start"
					@submenu:toggle="onReadySubmenu"
				/>
			</div>
			<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs); max-width: 22rem;">
				<p style="margin: 0; color: var(--color--text--tint-1);">
					Skeleton rows. Open Orders. Skeletons stay until every node arrives together.
				</p>
				<DropdownMenu
					:items="skeletonItems"
					placement="bottom-start"
					@submenu:toggle="onSkeletonSubmenu"
				/>
			</div>
			<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs); max-width: 22rem;">
				<p style="margin: 0; color: var(--color--text--tint-1);">
					Spinner. Open Orders. A spinner shows until the nodes arrive.
				</p>
				<DropdownMenu
					:items="spinnerItems"
					placement="bottom-start"
					@submenu:toggle="onSpinnerSubmenu"
				>
					<template #item-label="{ item, ui }">
						<span
							v-if="item.id === spinnerItemId"
							:class="ui.class"
							style="display: flex; justify-content: center; width: 100%;"
						>
							<N8nSpinner size="small" />
						</span>
						<span v-else :class="ui.class">{{ item.label }}</span>
					</template>
				</DropdownMenu>
			</div>
		</div>
		`,
	}),
	args: {
		items: [] as Array<DropdownMenuItemProps<string>>,
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
		<div style="display: flex; flex-wrap: wrap; gap: 20px">
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
		<div>
			<p style="margin-bottom: 16px; user-select: none;">Dropdown is {{ isOpen ? 'open' : 'closed' }}</p>
			<div style="margin-bottom: 16px;">
				<N8nButton @click="toggle">
					{{ isOpen ? 'Close' : 'Open' }} Dropdown
				</N8nButton>
			</div>
			<DropdownMenu
				v-model="isOpen"
				:items="args.items"
				placement="bottom-start"
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
		<div>
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

export const SelectableSubmenuParent: Story = {
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div>
			<p>
				Select the workflow from its label or with Enter. Open its nodes from the chevron or with ArrowRight.
			</p>
			<DropdownMenu placement="bottom-start" :items="args.items" @select="handleSelect" />
		</div>
		`,
	}),
	args: {
		items: [
			{
				id: 'orders',
				label: 'Orders workflow',
				selectable: true,
				children: [
					{ id: 'webhook', label: 'Webhook' },
					{ id: 'create-order', label: 'Create order' },
				],
			},
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const WithTooltips: Story = {
	render: (args) => ({
		components: { DropdownMenu, N8nIcon, N8nTooltip },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div>
			<DropdownMenu placement="bottom-start" :items="args.items" @select="handleSelect">
				<template #item-label="{ item, ui }">
					<N8nTooltip
						v-if="item.id === 'main-menu-item'"
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
					<N8nTooltip
						v-if="item.id === 'submenu-item'"
						:content="item.data.tooltip"
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
	}),
	args: {
		items: [
			{
				id: 'main-menu-item',
				label: 'Main menu item',
				data: { tooltip: 'Tooltip for the main menu item' },
			},
			{
				id: 'submenu',
				label: 'Open submenu',
				data: { tooltip: '' },
				children: [
					{
						id: 'submenu-item',
						label: 'Submenu item',
						data: { tooltip: 'Tooltip for the submenu item' },
					},
				],
			},
		] as Array<DropdownMenuItemProps<string, { tooltip: string }>>,
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
		<div>
			<DropdownMenu placement="bottom-start" :items="args.items" @select="handleSelect" />
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
		<div>
			<DropdownMenu placement="bottom-start" :items="args.items" @select="handleSelect" />
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

			const { filteredItems, handleSearch: handleDropdownSearch } = useDropdownSearch(allItems);

			const handleSearch = (term: string) => {
				console.log('Search term (debounced):', term);
				handleDropdownSearch(term);
			};

			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};

			return { args, filteredItems, handleSearch, handleSelect };
		},
		template: `
		<div>
			<DropdownMenu
				:items="filteredItems"
				placement="bottom-start"
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
		searchDebounce: 0,
	},
};

export const ExternalSearch: Story = {
	render: () => ({
		components: { DropdownMenu },
		setup() {
			const dropdownRef = ref<DropdownMenuExposed | null>(null);
			const textareaRef = ref<HTMLTextAreaElement | null>(null);
			const isOpen = ref(true);
			const query = ref('');
			const allItems: Array<DropdownMenuItemProps<string>> = [
				{ id: 'orders', label: 'Orders workflow' },
				{ id: 'invoices', label: 'Invoices workflow' },
				{ id: 'customers', label: 'Customers workflow' },
			];
			const filteredItems = computed(() =>
				allItems.filter((item) => item.label.toLowerCase().includes(query.value.toLowerCase())),
			);

			const handleKeydown = (event: KeyboardEvent) => {
				dropdownRef.value?.handleExternalKeydown(event);
			};

			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};

			return {
				dropdownRef,
				textareaRef,
				isOpen,
				query,
				filteredItems,
				handleKeydown,
				handleSelect,
			};
		},
		template: `
		<div style="display: flex; align-items: flex-start; gap: var(--spacing--xs);">
			<textarea
				ref="textareaRef"
				v-model="query"
				placeholder="Type to filter workflows"
				@focus="isOpen = true"
				@keydown="handleKeydown"
			/>
			<DropdownMenu
				ref="dropdownRef"
				v-model="isOpen"
				:items="filteredItems"
				placement="bottom-start"
				:external-focus-target="textareaRef"
				searchable
				search-mode="external"
				@select="handleSelect"
			/>
		</div>
		`,
	}),
	args: {
		items: [] as Array<DropdownMenuItemProps<string>>,
	},
};

export const ExternalSearchWithHeader: Story = {
	render: () => ({
		components: { DropdownMenu },
		setup() {
			const dropdownRef = ref<DropdownMenuExposed | null>(null);
			const textareaRef = ref<HTMLTextAreaElement | null>(null);
			const isOpen = ref(true);
			const query = ref('');
			const allItems: Array<DropdownMenuItemProps<string>> = [
				{ id: 'section-workflows', label: 'Workflows', header: true },
				{ id: 'orders', label: 'Orders workflow' },
				{ id: 'invoices', label: 'Invoices workflow' },
				{ id: 'customers', label: 'Customers workflow' },
			];
			const filteredItems = computed(() => {
				const term = query.value.trim().toLowerCase();
				if (!term) return allItems;
				return allItems.filter((item) => !item.header && item.label.toLowerCase().includes(term));
			});

			const handleKeydown = (event: KeyboardEvent) => {
				const handled = dropdownRef.value?.handleExternalKeydown(event) ?? false;
				// An unhandled Up or Down moves the caret. The mention menu treats that as leaving the query and closes.
				if (!handled && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
					isOpen.value = false;
				}
			};

			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};

			onMounted(async () => {
				await nextTick();
				dropdownRef.value?.highlightFirstItem();
			});

			return {
				dropdownRef,
				textareaRef,
				isOpen,
				query,
				filteredItems,
				handleKeydown,
				handleSelect,
			};
		},
		template: `
		<div style="display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing--xs);">
			<p style="margin: 0;">
				A section header sits above the first row. Press Up. The highlight stays on the first row, and the menu stays open.
			</p>
			<textarea
				ref="textareaRef"
				v-model="query"
				placeholder="Type to filter workflows"
				@focus="isOpen = true"
				@keydown="handleKeydown"
			/>
			<DropdownMenu
				ref="dropdownRef"
				v-model="isOpen"
				:items="filteredItems"
				:external-focus-target="textareaRef"
				searchable
				search-mode="external"
				placement="bottom-start"
				@select="handleSelect"
			/>
		</div>
		`,
	}),
	args: {
		items: [] as Array<DropdownMenuItemProps<string>>,
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
						...Array.from({ length: 40 }, (_, index) => ({
							id: `long-fruit-${index + 1}`,
							label: `Long submenu fruit ${index + 1}`,
						})),
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

			const { filteredItems, handleSearch: handleDropdownSearch } = useDropdownSearch(allItems);

			const handleSearch = (term: string) => {
				console.log('Search term (debounced):', term);
				handleDropdownSearch(term);
			};

			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};

			return { args, filteredItems, handleSearch, handleSelect };
		},
		template: `
		<div>
			<p style="margin-bottom: 16px; color: var(--color--text--tint-1);">
				The main menu is searchable, and the non-searchable "Fruits" submenu has enough
				items to scroll. Use this to verify hover and keyboard focus do not cause scroll jumps.
			</p>
			<DropdownMenu
				:items="filteredItems"
				placement="bottom-start"
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

export const SearchableRootWithFlatResults: Story = {
	render: () => ({
		components: { DropdownMenu },
		setup() {
			type Item = DropdownMenuItemProps<string>;

			const allItems: Item[] = [
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
			];

			const {
				search,
				filteredItems: searchResults,
				handleSearch: handleDropdownSearch,
			} = useDropdownSearch(allItems, {
				flatList: true,
				mapResult: (item, path) => ({
					...item,
					label: path.map((pathItem) => pathItem.label).join(' › '),
					divided: false,
				}),
			});

			const filteredItems = computed(() => (search.value.trim() ? searchResults.value : allItems));

			const handleSearch = (term: string) => {
				console.log('Search term (debounced):', term);
				handleDropdownSearch(term);
			};

			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};

			return { filteredItems, handleSearch, handleSelect };
		},
		template: `
		<div>
			<DropdownMenu
				:items="filteredItems"
				placement="bottom-start"
				searchable
				search-placeholder="Search and flatten results..."
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
			const allProjects: Array<DropdownMenuItemProps<string>> = [
				{ id: 'personal', label: 'Personal', icon: { type: 'icon', value: 'user' } },
				{ id: 'adore', label: 'Adore', icon: { type: 'emoji', value: '😍' } },
				{ id: 'assistant', label: 'AI Assistant', icon: { type: 'emoji', value: '🔮' } },
				{ id: 'cloud', label: 'Cloud', icon: { type: 'emoji', value: '🌏' } },
				{ id: 'Design', label: 'Design', icon: { type: 'emoji', value: '🎨' } },
				{ id: 'studies', label: 'Diary studies', icon: { type: 'emoji', value: '📖' } },
				{ id: 'evals', label: 'Evaluations workshop', icon: { type: 'icon', value: 'layers' } },
			];

			const { filteredItems: filteredProjects, handleSearch: handleProjectSearch } =
				useDropdownSearch(allProjects);

			const handleSearch = (term: string, itemId?: string) => {
				console.log('Search event:', { term, itemId });
				if (itemId === 'workflow') {
					handleProjectSearch(term);
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
		<div>
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
		<div>
			<p style="margin-bottom: 16px; color: var(--color--text--tint-1);">
				Open the dropdown and hover over "Recent Files" or "Shared With Me" to see lazy loading in action.
				Each submenu fetches its content independently when hovered.
			</p>
			<DropdownMenu
				:items="items"
				placement="bottom-start"
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

export const TruncatedLabelsWithTooltip: Story = {
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			const handleSelect = (action: string) => {
				console.log('Selected:', action);
			};
			return { args, handleSelect };
		},
		template: `
		<div>
			<p style="margin-bottom: 16px; color: var(--color--text--tint-1);">
				Hover over items with long labels to see the full text in a tooltip.
				Short labels (under 20 characters) won't show a tooltip.
			</p>
			<DropdownMenu
				:items="args.items"
				placement="bottom-start"
				show-full-label-on-hover
				@select="handleSelect"
			/>
		</div>
		`,
	}),
	args: {
		items: [
			{ id: 'short', label: 'Short label', icon: { type: 'icon', value: 'file' } },
			{ id: 'medium', label: 'A medium-length label', icon: { type: 'icon', value: 'file' } },
			{
				id: 'long',
				label: 'This is a very long workflow name that will be truncated',
				icon: { type: 'icon', value: 'file' },
			},
			{
				id: 'longer',
				label: 'Another extremely long label that definitely exceeds the dropdown width',
				icon: { type: 'icon', value: 'file' },
			},
		] as Array<DropdownMenuItemProps<string>>,
	},
};

export const EmptyState: Story = {
	render: (args) => ({
		components: { DropdownMenu },
		setup() {
			return { args };
		},
		template: `
		<div>
			<DropdownMenu placement="bottom-start" :items="args.items" />
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
		<div>
			<DropdownMenu placement="bottom-start" :items="args.items">
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
