import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { ref, watch } from 'vue';

import N8nToggleGroup from './ToggleGroup.vue';
import type { ButtonProps } from '../../types/button';
import type { IconName } from '../N8nIcon/icons';
import N8nToggle from '../N8nToggle/Toggle.vue';

const playgroundItemCounts = [3, 4, 5, 6] as const;

const meta = {
	title: 'Core/ToggleGroup',
	component: N8nToggleGroup,
	argTypes: {
		type: {
			control: 'select',
			options: ['single', 'multiple'],
		},
		variant: {
			control: 'select',
			options: ['solid', 'subtle', 'ghost', 'outline', 'destructive', 'success'],
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
		},
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
		},
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'Icon-only toggle and toggle group components built on Reka UI and styled with N8nButton variants and sizes.',
			},
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof N8nToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nToggleGroup, N8nToggle },
		setup() {
			const value = ref('left');
			return { args, value };
		},
		template: `
			<N8nToggleGroup v-model="value" v-bind="args">
				<template #default="{ variant, size, disabled }">
					<N8nToggle value="left" label="Align left" icon="align-right" :variant="variant" :size="size" :disabled="disabled" />
					<N8nToggle value="center" label="Align center" icon="stream" :variant="variant" :size="size" :disabled="disabled" />
					<N8nToggle value="right" label="Align right" icon="align-right" :variant="variant" :size="size" :disabled="disabled" />
				</template>
			</N8nToggleGroup>
		`,
	}),
	args: {
		type: 'single',
		variant: 'subtle',
		size: 'medium',
		orientation: 'horizontal',
		disabled: false,
	},
};

type PlaygroundItemCount = (typeof playgroundItemCounts)[number];

type PlaygroundItem = {
	value: string;
	label: string;
	icon: IconName;
};

type PlaygroundArgs = {
	itemCount: PlaygroundItemCount;
	type: 'single' | 'multiple';
	variant: NonNullable<ButtonProps['variant']>;
	size: NonNullable<ButtonProps['size']>;
	orientation: 'horizontal' | 'vertical';
	disabled: boolean;
	modelValue?: string | string[];
	defaultValue?: string | string[];
};

const playgroundItemsByCount: Record<PlaygroundItemCount, PlaygroundItem[]> = {
	3: [
		{ value: '1', label: 'Item 1', icon: 'bold' },
		{ value: '2', label: 'Item 2', icon: 'italic' },
		{ value: '3', label: 'Item 3', icon: 'underline' },
	],
	4: [
		{ value: '1', label: 'Item 1', icon: 'bold' },
		{ value: '2', label: 'Item 2', icon: 'italic' },
		{ value: '3', label: 'Item 3', icon: 'underline' },
		{ value: '4', label: 'Item 4', icon: 'strikethrough' },
	],
	5: [
		{ value: '1', label: 'Item 1', icon: 'bold' },
		{ value: '2', label: 'Item 2', icon: 'italic' },
		{ value: '3', label: 'Item 3', icon: 'underline' },
		{ value: '4', label: 'Item 4', icon: 'strikethrough' },
		{ value: '5', label: 'Item 5', icon: 'list' },
	],
	6: [
		{ value: '1', label: 'Item 1', icon: 'bold' },
		{ value: '2', label: 'Item 2', icon: 'italic' },
		{ value: '3', label: 'Item 3', icon: 'underline' },
		{ value: '4', label: 'Item 4', icon: 'strikethrough' },
		{ value: '5', label: 'Item 5', icon: 'list' },
		{ value: '6', label: 'Item 6', icon: 'list-ordered' },
	],
};

function playgroundValue(
	itemCount: PlaygroundItemCount,
	type: PlaygroundArgs['type'],
	current: string | string[],
): string | string[] {
	const next = playgroundItemsByCount[itemCount];
	const valid = new Set(next.map((item) => item.value));

	if (type === 'multiple') {
		const asArray = Array.isArray(current) ? current : [current];
		const filtered = asArray.filter((value) => valid.has(value));
		return filtered.length > 0 ? filtered : [next[0]?.value ?? '1'];
	}

	const asSingle = Array.isArray(current) ? current[0] : current;
	return asSingle && valid.has(asSingle) ? asSingle : (next[0]?.value ?? '1');
}

/** itemCount is a Figma-style variant: each value swaps in a hard-coded toggle list. */
export const Playground: StoryObj<PlaygroundArgs> = {
	render: (args) => ({
		components: { N8nToggleGroup, N8nToggle },
		setup() {
			const value = ref<string | string[]>('1');

			watch(
				() => [args.itemCount, args.type] as const,
				([itemCount, type]) => {
					value.value = playgroundValue(itemCount, type, value.value);
				},
			);

			return {
				args,
				value,
				playgroundItemsByCount,
				onInput: action('update:modelValue'),
			};
		},
		template: `
			<N8nToggleGroup
				v-model="value"
				:type="args.type"
				:variant="args.variant"
				:size="args.size"
				:orientation="args.orientation"
				:disabled="args.disabled"
				@update:model-value="onInput"
			>
				<template #default="{ variant, size, disabled }">
					<N8nToggle
						v-for="item in playgroundItemsByCount[args.itemCount]"
						:key="item.value"
						:value="item.value"
						:label="item.label"
						:icon="item.icon"
						:variant="variant"
						:size="size"
						:disabled="disabled"
					/>
				</template>
			</N8nToggleGroup>
		`,
	}),
	args: {
		itemCount: 3,
		type: 'single',
		variant: 'subtle',
		size: 'medium',
		orientation: 'horizontal',
		disabled: false,
	},
	argTypes: {
		itemCount: {
			control: 'radio',
			options: [...playgroundItemCounts],
			description:
				'Variant for how many toggles to show. Map to the Figma "number of items" property.',
		},
		modelValue: { table: { disable: true } },
		defaultValue: { table: { disable: true } },
	},
};

export const Variants: Story = {
	render: () => ({
		components: { N8nToggleGroup, N8nToggle },
		setup() {
			return {
				variants: ['solid', 'subtle', 'ghost', 'outline', 'destructive', 'success'],
			};
		},
		template: `
			<div style="display: grid; gap: 12px;">
				<N8nToggleGroup v-for="variant in variants" :key="variant" :default-value="'left'" :variant="variant">
					<template #default="slotProps">
						<N8nToggle value="left" label="Align left" icon="align-right" v-bind="slotProps" />
						<N8nToggle value="center" label="Align center" icon="stream" v-bind="slotProps" />
						<N8nToggle value="right" label="Align right" icon="align-right" v-bind="slotProps" />
					</template>
				</N8nToggleGroup>
			</div>
		`,
	}),
};

export const Sizes: Story = {
	render: () => ({
		components: { N8nToggleGroup, N8nToggle },
		setup() {
			return {
				sizes: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
			};
		},
		template: `
			<div style="display: grid; gap: 12px;">
				<N8nToggleGroup v-for="size in sizes" :key="size" :default-value="'left'" :size="size">
					<template #default="slotProps">
						<N8nToggle value="left" label="Align left" icon="align-right" v-bind="slotProps" />
						<N8nToggle value="center" label="Align center" icon="stream" v-bind="slotProps" />
						<N8nToggle value="right" label="Align right" icon="align-right" v-bind="slotProps" />
					</template>
				</N8nToggleGroup>
			</div>
		`,
	}),
};
