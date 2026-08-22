import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { defineComponent, ref } from 'vue';

import Listbox from './Listbox.vue';
import ListboxItem from './ListboxItem.vue';
import { ListboxVirtualizer } from './reka-ui';
import type { DropdownMenuItemProps } from '../../../components/N8nDropdownMenu/DropdownMenu.types';
import N8nDropdownMenu from '../../../components/N8nDropdownMenu/DropdownMenu.vue';
import N8nIconButton from '../../../components/N8nIconButton/IconButton.vue';

const meta = {
	title: 'Experimental/Listbox',
	component: Listbox,
	parameters: {
		docs: {
			description: {
				component:
					'Keyboard-navigable selectable list. Put row actions in the trailing slot so dropdowns stay outside the option.',
			},
			source: { type: 'dynamic' },
		},
		layout: 'centered',
	},
	argTypes: {
		size: {
			control: 'select',
			options: ['small', 'default', 'medium'],
		},
		variant: {
			control: 'select',
			options: ['boxed', 'flush'],
		},
		disabled: { control: 'boolean' },
		highlightOnHover: { control: 'boolean' },
		multiple: { control: 'boolean' },
	},
} satisfies Meta<typeof Listbox>;

export default meta;

type Story = StoryObj<typeof meta>;

type DemoItem = {
	id: string;
	label: string;
	description: string;
	disabled?: boolean;
};

const sampleItems: DemoItem[] = [
	{ id: 'production', label: 'production', description: '12 workflows' },
	{ id: 'staging', label: 'staging', description: '4 workflows' },
	{ id: 'internal', label: 'internal', description: 'Not being used' },
	{ id: 'customer-facing', label: 'customer-facing', description: '7 workflows' },
	{ id: 'legacy', label: 'legacy', description: '1 workflow', disabled: true },
];

const rowActions: Array<DropdownMenuItemProps<'edit' | 'delete'>> = [
	{ id: 'edit', label: 'Edit', icon: { type: 'icon', value: 'pen' } },
	{ id: 'delete', label: 'Delete', icon: { type: 'icon', value: 'trash-2' } },
];

const ListboxBasicDemo = defineComponent({
	name: 'ListboxBasicDemo',
	components: { Listbox, ListboxItem },
	props: {
		size: { type: String, default: 'default' },
		variant: { type: String, default: 'boxed' },
		disabled: { type: Boolean, default: false },
		highlightOnHover: { type: Boolean, default: true },
	},
	setup() {
		const selected = ref('production');
		return {
			selected,
			sampleItems,
			onUpdate: action('update:modelValue'),
		};
	},
	template: `
		<div style="width: 360px; padding: 24px;">
			<Listbox
				v-model="selected"
				:size="size"
				:variant="variant"
				:disabled="disabled"
				:highlight-on-hover="highlightOnHover"
				aria-label="Tags"
				@update:model-value="onUpdate"
			>
				<ListboxItem
					v-for="item in sampleItems"
					:key="item.id"
					:value="item.id"
					:label="item.label"
					:description="item.description"
					:disabled="item.disabled"
				/>
			</Listbox>
			<p style="margin-top: 16px; font-size: 14px;">Selected: <strong>{{ selected }}</strong></p>
		</div>
	`,
});

const ListboxSizesDemo = defineComponent({
	name: 'ListboxSizesDemo',
	components: { Listbox, ListboxItem },
	setup() {
		const selectedSmall = ref('production');
		const selectedDefault = ref('production');
		const selectedMedium = ref('production');
		const items = sampleItems.slice(0, 3);
		return { selectedSmall, selectedDefault, selectedMedium, items };
	},
	template: `
		<div style="width: 960px; padding: 24px; display: flex; gap: 24px;">
			<section style="flex: 1; min-width: 0;">
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">small</h3>
				<Listbox v-model="selectedSmall" size="small" aria-label="Small listbox">
					<ListboxItem
						v-for="item in items"
						:key="'small-' + item.id"
						:value="item.id"
						:label="item.label"
						:description="item.description"
					/>
				</Listbox>
			</section>
			<section style="flex: 1; min-width: 0;">
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">default</h3>
				<Listbox v-model="selectedDefault" size="default" aria-label="Default listbox">
					<ListboxItem
						v-for="item in items"
						:key="'default-' + item.id"
						:value="item.id"
						:label="item.label"
						:description="item.description"
					/>
				</Listbox>
			</section>
			<section style="flex: 1; min-width: 0;">
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">medium</h3>
				<Listbox v-model="selectedMedium" size="medium" aria-label="Medium listbox">
					<ListboxItem
						v-for="item in items"
						:key="'medium-' + item.id"
						:value="item.id"
						:label="item.label"
						:description="item.description"
					/>
				</Listbox>
			</section>
		</div>
	`,
});

const ListboxVariantsDemo = defineComponent({
	name: 'ListboxVariantsDemo',
	components: { Listbox, ListboxItem },
	setup() {
		const selectedBoxed = ref('production');
		const selectedFlush = ref('production');
		const items = sampleItems.slice(0, 3);
		return { selectedBoxed, selectedFlush, items };
	},
	template: `
		<div style="width: 720px; padding: 24px; display: flex; gap: 24px;">
			<section style="flex: 1; min-width: 0;">
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">boxed</h3>
				<p style="margin: 0 0 12px; font-size: 13px; color: var(--text-color--subtle);">
					Bordered container for standalone lists.
				</p>
				<Listbox v-model="selectedBoxed" variant="boxed" aria-label="Boxed listbox">
					<ListboxItem
						v-for="item in items"
						:key="'boxed-' + item.id"
						:value="item.id"
						:label="item.label"
						:description="item.description"
					/>
				</Listbox>
			</section>
			<section
				style="
					flex: 1;
					min-width: 0;
					padding: var(--spacing--md);
					background: var(--background--surface);
					border: 1px dashed var(--border-color--subtle);
					border-radius: var(--radius);
				"
			>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">flush</h3>
				<p style="margin: 0 0 12px; font-size: 13px; color: var(--text-color--subtle);">
					Labels align with this copy; hover uses a rounded surface behind each item.
				</p>
				<Listbox v-model="selectedFlush" variant="flush" aria-label="Flush listbox">
					<ListboxItem
						v-for="item in items"
						:key="'flush-' + item.id"
						:value="item.id"
						:label="item.label"
						:description="item.description"
					/>
				</Listbox>
			</section>
		</div>
	`,
});

const ListboxWithDropdownDemo = defineComponent({
	name: 'ListboxWithDropdownDemo',
	components: { Listbox, ListboxItem, N8nDropdownMenu, N8nIconButton },
	setup() {
		const selected = ref('staging');
		return {
			selected,
			sampleItems,
			rowActions,
			onUpdate: action('update:modelValue'),
			onAction: action('row-action'),
		};
	},
	template: `
		<div style="width: 360px; padding: 24px;">
			<Listbox
				v-model="selected"
				aria-label="Tags with actions"
				@update:model-value="onUpdate"
			>
				<ListboxItem
					v-for="item in sampleItems"
					:key="item.id"
					:value="item.id"
					:label="item.label"
					:description="item.description"
					:disabled="item.disabled"
				>
					<template v-if="!item.disabled" #trailing="{ setMenuOpen }">
						<N8nDropdownMenu
							:items="rowActions"
							placement="bottom-end"
							width="12rem"
							:modal="false"
							@update:model-value="setMenuOpen"
							@select="(actionId) => onAction({ tag: item.id, action: actionId })"
						>
							<template #trigger>
								<N8nIconButton
									variant="subtle"
									icon="ellipsis-vertical"
									aria-label="Tag actions"
								/>
							</template>
						</N8nDropdownMenu>
					</template>
				</ListboxItem>
			</Listbox>
			<p style="margin-top: 16px; font-size: 14px;">Selected: <strong>{{ selected }}</strong></p>
		</div>
	`,
});

const ListboxMixedTrailingDemo = defineComponent({
	name: 'ListboxMixedTrailingDemo',
	components: { Listbox, ListboxItem, N8nDropdownMenu, N8nIconButton },
	setup() {
		const selected = ref('production');
		const withActions = new Set(['production', 'customer-facing']);
		return {
			selected,
			sampleItems,
			rowActions,
			withActions,
			onUpdate: action('update:modelValue'),
			onAction: action('row-action'),
		};
	},
	template: `
		<div style="width: 360px; padding: 24px;">
			<p style="margin: 0 0 12px; font-size: 13px; color: var(--text-color--subtle);">
				Some rows have a trailing menu; others are plain selectable items.
			</p>
			<Listbox
				v-model="selected"
				aria-label="Mixed trailing actions"
				@update:model-value="onUpdate"
			>
				<ListboxItem
					v-for="item in sampleItems"
					:key="item.id"
					:value="item.id"
					:label="item.label"
					:description="item.description"
					:disabled="item.disabled"
				>
					<template v-if="withActions.has(item.id)" #trailing="{ setMenuOpen }">
						<N8nDropdownMenu
							:items="rowActions"
							placement="bottom-end"
							width="12rem"
							:modal="false"
							@update:model-value="setMenuOpen"
							@select="(actionId) => onAction({ tag: item.id, action: actionId })"
						>
							<template #trigger>
								<N8nIconButton
									variant="subtle"
									icon="ellipsis-vertical"
									aria-label="Tag actions"
								/>
							</template>
						</N8nDropdownMenu>
					</template>
				</ListboxItem>
			</Listbox>
		</div>
	`,
});

const ListboxControlledUncontrolledDemo = defineComponent({
	name: 'ListboxControlledUncontrolledDemo',
	components: { Listbox, ListboxItem },
	setup() {
		const selected = ref('production');
		return {
			selected,
			sampleItems: sampleItems.slice(0, 3),
			onUpdate: action('update:modelValue'),
		};
	},
	template: `
		<div style="width: 720px; padding: 24px; display: flex; gap: 32px;">
			<section style="flex: 1;">
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Controlled</h3>
				<p style="margin: 0 0 12px; font-size: 13px; color: var(--text-color--subtle);">
					Parent-controlled via <code>v-model</code>. Use the buttons to set the value externally.
				</p>
				<Listbox
					key="controlled"
					v-model="selected"
					aria-label="Controlled listbox"
					@update:model-value="onUpdate"
				>
					<ListboxItem
						v-for="item in sampleItems"
						:key="'controlled-' + item.id"
						:value="item.id"
						:label="item.label"
						:description="item.description"
					/>
				</Listbox>
				<div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
					<button
						v-for="item in sampleItems"
						:key="item.id"
						type="button"
						style="padding: 4px 12px; font-size: 13px; cursor: pointer;"
						@click="selected = item.id"
					>
						Set "{{ item.label }}"
					</button>
				</div>
				<p style="margin-top: 12px; font-size: 14px;">Selected: <strong>{{ selected }}</strong></p>
			</section>
			<section style="flex: 1;">
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Uncontrolled</h3>
				<p style="margin: 0 0 12px; font-size: 13px; color: var(--text-color--subtle);">
					Initial selection via <code>default-value</code> only. Parent does not track changes.
				</p>
				<Listbox
					key="uncontrolled"
					default-value="staging"
					aria-label="Uncontrolled listbox"
					@update:model-value="onUpdate"
				>
					<ListboxItem
						v-for="item in sampleItems"
						:key="'uncontrolled-' + item.id"
						:value="item.id"
						:label="item.label"
						:description="item.description"
					/>
				</Listbox>
			</section>
		</div>
	`,
});

const ListboxMultipleDemo = defineComponent({
	name: 'ListboxMultipleDemo',
	components: { Listbox, ListboxItem },
	setup() {
		const selected = ref<string[]>(['production', 'staging']);
		return {
			selected,
			sampleItems: sampleItems.filter((item) => !item.disabled),
			onUpdate: action('update:modelValue'),
		};
	},
	template: `
		<div style="width: 360px; padding: 24px;">
			<Listbox
				v-model="selected"
				multiple
				aria-label="Multi-select tags"
				@update:model-value="onUpdate"
			>
				<ListboxItem
					v-for="item in sampleItems"
					:key="item.id"
					:value="item.id"
					:label="item.label"
					:description="item.description"
				/>
			</Listbox>
			<p style="margin-top: 16px; font-size: 14px;">
				Selected: <strong>{{ selected.join(', ') || 'none' }}</strong>
			</p>
		</div>
	`,
});

const VIRTUAL_ITEM_COUNT = 1000;
const VIRTUAL_ESTIMATE_SIZE = 56;

const virtualItems: DemoItem[] = Array.from({ length: VIRTUAL_ITEM_COUNT }, (_, index) => {
	const id = `tag-${index + 1}`;
	return {
		id,
		label: id,
		description: index % 7 === 0 ? 'Not being used' : `${(index % 20) + 1} workflows`,
		disabled: index % 47 === 0,
	};
});

const ListboxVirtualizedDemo = defineComponent({
	name: 'ListboxVirtualizedDemo',
	components: { Listbox, ListboxItem, ListboxVirtualizer },
	setup() {
		const selected = ref(virtualItems[0]);
		return {
			selected,
			virtualItems,
			VIRTUAL_ITEM_COUNT,
			VIRTUAL_ESTIMATE_SIZE,
			textContent: (option: DemoItem) => option.label,
			onUpdate: action('update:modelValue'),
		};
	},
	template: `
		<div style="width: 360px; padding: 24px;">
			<p style="margin: 0 0 12px; font-size: 13px; color: var(--text-color--subtle);">
				{{ VIRTUAL_ITEM_COUNT }} items via Reka <code>ListboxVirtualizer</code>.
				Only visible rows are mounted.
			</p>
			<Listbox
				v-model="selected"
				by="id"
				max-height="360px"
				aria-label="Virtualized tags"
				@update:model-value="onUpdate"
			>
				<ListboxVirtualizer
					v-slot="{ option }"
					:options="virtualItems"
					:estimate-size="VIRTUAL_ESTIMATE_SIZE"
					:text-content="textContent"
				>
					<ListboxItem
						:value="option"
						:label="option.label"
						:description="option.description"
						:disabled="option.disabled"
					/>
				</ListboxVirtualizer>
			</Listbox>
			<p style="margin-top: 16px; font-size: 14px;">
				Selected: <strong>{{ selected?.label ?? 'none' }}</strong>
			</p>
		</div>
	`,
});

const ListboxCustomItemDemo = defineComponent({
	name: 'ListboxCustomItemDemo',
	components: { Listbox, ListboxItem, N8nDropdownMenu, N8nIconButton },
	setup() {
		const selected = ref('production');
		const people = [
			{
				id: 'production',
				name: 'Production',
				email: 'prod@example.com',
				initials: 'PR',
				status: 'Active',
			},
			{
				id: 'staging',
				name: 'Staging',
				email: 'staging@example.com',
				initials: 'ST',
				status: 'Active',
			},
			{
				id: 'legacy',
				name: 'Legacy',
				email: 'legacy@example.com',
				initials: 'LG',
				status: 'Archived',
			},
		];
		return {
			selected,
			people,
			rowActions,
			onUpdate: action('update:modelValue'),
			onAction: action('row-action'),
		};
	},
	template: `
		<div style="width: 420px; padding: 24px;">
			<p style="margin: 0 0 12px; font-size: 13px; color: var(--text-color--subtle);">
				Fully custom item via the default slot — avatar, meta, and status replace the built-in label/description layout.
			</p>
			<Listbox
				v-model="selected"
				aria-label="Custom listbox items"
				@update:model-value="onUpdate"
			>
				<ListboxItem
					v-for="person in people"
					:key="person.id"
					:value="person.id"
				>
					<template #default>
						<div style="display: flex; align-items: center; gap: 12px; min-width: 0; width: 100%;">
							<span
								aria-hidden="true"
								style="
									display: inline-flex;
									align-items: center;
									justify-content: center;
									width: 32px;
									height: 32px;
									border-radius: 999px;
									background: var(--color--background--light-1);
									color: var(--color--text--shade-1);
									font-size: 11px;
									font-weight: 600;
									flex-shrink: 0;
								"
							>
								{{ person.initials }}
							</span>
							<span style="display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1;">
								<span style="font-size: 14px; font-weight: 500; line-height: 1.3; color: var(--color--text--shade-1);">
									{{ person.name }}
								</span>
								<span style="font-size: 12px; line-height: 1.25; color: var(--text-color--subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
									{{ person.email }}
								</span>
							</span>
							<span
								style="
									flex-shrink: 0;
									font-size: 11px;
									line-height: 1.25;
									color: var(--text-color--subtle);
									padding: 2px 8px;
									border-radius: 999px;
									border: 1px solid var(--border-color--subtle);
								"
							>
								{{ person.status }}
							</span>
						</div>
					</template>
					<template #trailing="{ setMenuOpen }">
						<N8nDropdownMenu
							:items="rowActions"
							placement="bottom-end"
							width="12rem"
							:modal="false"
							@update:model-value="setMenuOpen"
							@select="(actionId) => onAction({ id: person.id, action: actionId })"
						>
							<template #trigger>
								<N8nIconButton
									variant="subtle"
									icon="ellipsis-vertical"
									aria-label="Item actions"
								/>
							</template>
						</N8nDropdownMenu>
					</template>
				</ListboxItem>
			</Listbox>
			<p style="margin-top: 16px; font-size: 14px;">Selected: <strong>{{ selected }}</strong></p>
		</div>
	`,
});

export const Default: Story = {
	name: 'Without dropdown',
	render: (args) => ({
		components: { ListboxBasicDemo },
		setup: () => ({ args }),
		template: '<ListboxBasicDemo v-bind="args" />',
	}),
	args: {
		size: 'default',
		variant: 'boxed',
		disabled: false,
		highlightOnHover: true,
	},
};

export const Sizes: Story = {
	name: 'Sizes',
	render: () => ({
		components: { ListboxSizesDemo },
		template: '<ListboxSizesDemo />',
	}),
};

export const Variants: Story = {
	name: 'Variants',
	render: () => ({
		components: { ListboxVariantsDemo },
		template: '<ListboxVariantsDemo />',
	}),
};

export const WithDropdown: Story = {
	name: 'With dropdown',
	render: () => ({
		components: { ListboxWithDropdownDemo },
		template: '<ListboxWithDropdownDemo />',
	}),
};

export const MixedTrailing: Story = {
	name: 'Mixed trailing actions',
	render: () => ({
		components: { ListboxMixedTrailingDemo },
		template: '<ListboxMixedTrailingDemo />',
	}),
};

export const ControlledUncontrolled: Story = {
	name: 'Controlled / Uncontrolled',
	render: () => ({
		components: { ListboxControlledUncontrolledDemo },
		template: '<ListboxControlledUncontrolledDemo />',
	}),
};

export const Multiple: Story = {
	name: 'Multiple selection',
	render: () => ({
		components: { ListboxMultipleDemo },
		template: '<ListboxMultipleDemo />',
	}),
};

export const CustomItem: Story = {
	name: 'Custom item',
	render: () => ({
		components: { ListboxCustomItemDemo },
		template: '<ListboxCustomItemDemo />',
	}),
};

export const Virtualized: Story = {
	name: 'Virtualized',
	render: () => ({
		components: { ListboxVirtualizedDemo },
		template: '<ListboxVirtualizedDemo />',
	}),
};
