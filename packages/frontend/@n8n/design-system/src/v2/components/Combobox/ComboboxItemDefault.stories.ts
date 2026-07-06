import type { Meta, StoryObj } from '@storybook/vue3-vite';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { ComboboxItemDefaultProps } from './ComboboxItemDefault.types';
import ComboboxItemDefault from './ComboboxItemDefault.vue';
import previewStyles from './ComboboxItemDefault.stories.module.css';

const longLabel = 'Quarterly automation rollout for customer onboarding and billing reconciliation';

type VariantConfig = {
	name: string;
	props: ComboboxItemDefaultProps;
	selected?: boolean;
};

const variants: VariantConfig[] = [
	{
		name: 'Default',
		props: {
			label: 'Workflows',
			icon: 'bolt-filled',
		},
	},
	{
		name: 'Selected',
		props: {
			label: 'All workflows',
			icon: 'list-tree',
		},
		selected: true,
	},
	{
		name: 'Disabled',
		props: {
			label: 'Credentials',
			icon: 'lock',
			disabled: true,
		},
	},
	{
		name: 'Without icon',
		props: {
			label: 'Variables',
		},
	},
	{
		name: 'Long label',
		props: {
			label: longLabel,
			icon: 'list-tree',
		},
	},
];

const meta = {
	title: 'Experimental/Combobox/ComboboxItemDefault',
	component: ComboboxItemDefault,
	tags: ['autodocs'],
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		label: {
			control: { type: 'text' },
			description: 'Item label text',
		},
		icon: {
			control: { type: 'text' },
			description: 'Leading icon name',
		},
		disabled: {
			control: { type: 'boolean' },
			description: 'Whether the item is disabled',
		},
		size: {
			control: { type: 'select' },
			options: ['mini', 'small', 'medium', 'large', 'xlarge'],
			description: 'Item size',
		},
	},
} satisfies Meta<typeof ComboboxItemDefault>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { ComboboxItemDefault },
		setup() {
			return { args };
		},
		template: `
			<div style="width: 320px;">
				<ComboboxItemDefault v-bind="args" />
			</div>
		`,
	}),
	args: {
		label: 'Workflows',
		icon: 'bolt-filled',
		size: 'large',
	},
};

export const Sizes: Story = {
	render: (args) => ({
		components: { ComboboxItemDefault },
		setup() {
			const { size: _size, ...itemArgs } = args;
			return { itemArgs };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 320px;">
				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs);">
					<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
						xlarge · var(--font-size--md)
					</span>
					<ComboboxItemDefault v-bind="itemArgs" size="xlarge" />
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs);">
					<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
						large (default) · var(--font-size--sm)
					</span>
					<ComboboxItemDefault v-bind="itemArgs" size="large" />
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs);">
					<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
						medium · var(--font-size--sm)
					</span>
					<ComboboxItemDefault v-bind="itemArgs" size="medium" />
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs);">
					<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
						small · var(--font-size--xs)
					</span>
					<ComboboxItemDefault v-bind="itemArgs" size="small" />
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs);">
					<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
						mini · var(--font-size--2xs)
					</span>
					<ComboboxItemDefault v-bind="itemArgs" size="mini" />
				</div>
			</div>
		`,
	}),
	args: {
		label: 'Workflows',
		icon: 'bolt-filled',
	},
};

export const Variants: Story = {
	render: () => ({
		components: { ComboboxItemDefault, Icon },
		setup() {
			return { variants, previewStyles };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 320px;">
				<div
					v-for="variant in variants"
					:key="variant.name"
					style="display: flex; flex-direction: column; gap: var(--spacing--4xs);"
				>
					<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
						{{ variant.name }}
					</span>
					<ComboboxItemDefault
						v-bind="variant.props"
						size="large"
						:class="{
							[previewStyles.previewRowSelected]: variant.selected,
						}"
					>
						<template v-if="variant.selected" #item-trailing="{ ui }">
							<Icon icon="check" v-bind="ui" />
						</template>
					</ComboboxItemDefault>
				</div>
			</div>
		`,
	}),
	args: {
		label: 'Workflows',
		icon: 'bolt-filled',
		size: 'large',
	},
};

export const ItemSlots: Story = {
	render: () => ({
		components: { ComboboxItemDefault, Icon },
		setup() {
			const item: ComboboxItemDefaultProps = {
				label: 'Light',
				icon: 'wrench',
			};

			return { item, previewStyles };
		},
		template: `
			<div style="width: 320px;">
				<ComboboxItemDefault v-bind="item" size="large" :class="previewStyles.previewRowSelected">
					<template #item-leading="{ ui }">
						<span v-bind="ui" style="color: var(--color--primary);">★</span>
					</template>
					<template #item-label="{ item: slotItem }">
						Custom: {{ slotItem.label }}
					</template>
					<template #item-trailing="{ ui }">
						<span v-bind="ui" style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
							trailing
						</span>
						<Icon icon="check" :class="ui.class" />
					</template>
				</ComboboxItemDefault>
			</div>
		`,
	}),
	args: {
		label: 'Light',
		icon: 'wrench',
	},
};
