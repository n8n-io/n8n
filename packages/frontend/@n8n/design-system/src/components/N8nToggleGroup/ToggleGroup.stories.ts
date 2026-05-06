import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nToggle from '../N8nToggle/Toggle.vue';
import N8nToggleGroup from './ToggleGroup.vue';

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

export const Toggle: Story = {
	render: (args) => ({
		components: { N8nToggle },
		setup() {
			const pressed = ref(false);
			return { args, pressed };
		},
		template: `
			<div style="display: grid; place-items: center;">
				<N8nToggle
					v-model="pressed"
					label="Toggle bold"
					icon="text"
					:variant="args.variant"
					:size="args.size"
					:disabled="args.disabled"
				/>
			</div>
		`,
	}),
	args: {
		variant: 'solid',
		size: 'medium',
		disabled: false,
	},
};

export const SingleSelection: Story = {
	render: (args) => ({
		components: { N8nToggleGroup, N8nToggle },
		setup() {
			const value = ref('left');
			return { args, value };
		},
		template: `
			<div style="display: grid; place-items: center;">
				<N8nToggleGroup v-model="value" v-bind="args">
					<template #default="{ variant, size }">
						<N8nToggle value="left" label="Align left" icon="align-right" :variant="variant" :size="size" />
						<N8nToggle value="center" label="Align center" icon="stream" :variant="variant" :size="size" />
						<N8nToggle value="right" label="Align right" icon="align-right" :variant="variant" :size="size" />
					</template>
				</N8nToggleGroup>
			</div>
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

export const MultipleSelection: Story = {
	render: (args) => ({
		components: { N8nToggleGroup, N8nToggle },
		setup() {
			const value = ref(['bold']);
			return { args, value };
		},
		template: `
			<div style="display: grid; place-items: center;">
				<N8nToggleGroup v-model="value" v-bind="args">
					<template #default="{ variant, size }">
						<N8nToggle value="bold" label="Bold" icon="text" :variant="variant" :size="size" />
						<N8nToggle value="italic" label="Italic" icon="case-upper" :variant="variant" :size="size" />
						<N8nToggle value="underline" label="Underline" icon="text" :variant="variant" :size="size" />
					</template>
				</N8nToggleGroup>
			</div>
		`,
	}),
	args: {
		type: 'multiple',
		variant: 'outline',
		size: 'medium',
		orientation: 'horizontal',
		disabled: false,
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
			<div style="display: grid; gap: 12px; place-items: center;">
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
