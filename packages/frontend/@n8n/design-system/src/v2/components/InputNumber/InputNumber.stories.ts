import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import InputNumber from './InputNumber.vue';

const meta = {
	title: 'Components v2/InputNumber',
	component: InputNumber,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		size: {
			control: 'select',
			options: ['mini', 'small', 'medium', 'large', 'xlarge'],
		},
	},
} satisfies Meta<typeof InputNumber>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic = {
	render: (args) => ({
		components: { InputNumber },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; max-width: 300px;">
			<InputNumber v-bind="args" v-model="value" />
			<p style="margin-top: 16px;">Value: {{ value }}</p>
		</div>
		`,
	}),
	args: {
		modelValue: 0,
		placeholder: 'Enter a number',
	},
} satisfies Story;

export const WithControlsBoth = {
	render: (args) => ({
		components: { InputNumber },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; max-width: 300px;">
			<InputNumber v-bind="args" v-model="value" :controls="true" controls-position="both" />
			<p style="margin-top: 16px;">Value: {{ value }}</p>
		</div>
		`,
	}),
	args: {
		modelValue: 5,
		min: 0,
		max: 10,
	},
} satisfies Story;

export const WithControlsRight = {
	render: (args) => ({
		components: { InputNumber },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; max-width: 300px;">
			<InputNumber v-bind="args" v-model="value" :controls="true" controls-position="right" />
			<p style="margin-top: 16px;">Value: {{ value }}</p>
		</div>
		`,
	}),
	args: {
		modelValue: 5,
		min: 0,
		max: 10,
	},
} satisfies Story;

export const Sizes = {
	render: (args) => ({
		components: { InputNumber },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; max-width: 300px;">
			<h3>mini</h3>
			<InputNumber v-model="value" size="mini" placeholder="mini" />
			<h3 style="margin-top: 15px;">small</h3>
			<InputNumber v-model="value" size="small" placeholder="small" />
			<h3 style="margin-top: 15px;">medium (default)</h3>
			<InputNumber v-model="value" size="medium" placeholder="medium" />
			<h3 style="margin-top: 15px;">large</h3>
			<InputNumber v-model="value" size="large" placeholder="large" />
			<h3 style="margin-top: 15px;">xlarge</h3>
			<InputNumber v-model="value" size="xlarge" placeholder="xlarge" />
		</div>
		`,
	}),
	args: {
		modelValue: 42,
	},
} satisfies Story;

export const Precision = {
	render: (args) => ({
		components: { InputNumber },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; max-width: 300px;">
			<h3>No precision</h3>
			<InputNumber v-model="value" placeholder="Any decimals" />
			<h3 style="margin-top: 15px;">Precision: 2</h3>
			<InputNumber v-model="value" :precision="2" placeholder="0.00" />
			<h3 style="margin-top: 15px;">Precision: 0 (integers only)</h3>
			<InputNumber v-model="value" :precision="0" placeholder="0" />
			<p style="margin-top: 16px;">Value: {{ value }}</p>
		</div>
		`,
	}),
	args: {
		modelValue: 3.14159,
	},
} satisfies Story;

export const MinMax = {
	render: (args) => ({
		components: { InputNumber },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; max-width: 300px;">
			<p>Range: 0 to 100, Step: 10</p>
			<InputNumber v-bind="args" v-model="value" :controls="true" controls-position="both" />
			<p style="margin-top: 16px;">Value: {{ value }}</p>
		</div>
		`,
	}),
	args: {
		modelValue: 50,
		min: 0,
		max: 100,
		step: 10,
	},
} satisfies Story;

export const Disabled = {
	render: (args) => ({
		components: { InputNumber },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="display: flex; gap: 16px; align-items: center; padding: 40px;">
			<div>
				<h3>Default</h3>
				<InputNumber v-model="value" placeholder="Enabled" />
			</div>
			<div>
				<h3>Disabled</h3>
				<InputNumber v-model="value" placeholder="Disabled" :disabled="true" />
			</div>
		</div>
		`,
	}),
	args: {
		modelValue: 42,
	},
} satisfies Story;

export const CustomButtons = {
	render: (args) => ({
		components: { InputNumber, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; max-width: 300px;">
			<InputNumber v-bind="args" v-model="value" :controls="true" controls-position="both">
				<template #decrement>
					<N8nIcon icon="minus" size="small" />
				</template>
				<template #increment>
					<N8nIcon icon="plus" size="small" />
				</template>
			</InputNumber>
			<p style="margin-top: 16px;">Value: {{ value }}</p>
		</div>
		`,
	}),
	args: {
		modelValue: 5,
		min: 1,
		max: 99,
	},
} satisfies Story;

export const ControlsSizes = {
	render: (args) => ({
		components: { InputNumber },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; display: flex; gap: 32px;">
			<div style="max-width: 200px;">
				<h3>Both (left/right)</h3>
				<InputNumber v-model="value" size="mini" :controls="true" controls-position="both" style="margin-bottom: 10px;" />
				<InputNumber v-model="value" size="small" :controls="true" controls-position="both" style="margin-bottom: 10px;" />
				<InputNumber v-model="value" size="medium" :controls="true" controls-position="both" style="margin-bottom: 10px;" />
				<InputNumber v-model="value" size="large" :controls="true" controls-position="both" style="margin-bottom: 10px;" />
			</div>
			<div style="max-width: 200px;">
				<h3>Right (stacked)</h3>
				<InputNumber v-model="value" size="mini" :controls="true" controls-position="right" style="margin-bottom: 10px;" />
				<InputNumber v-model="value" size="small" :controls="true" controls-position="right" style="margin-bottom: 10px;" />
				<InputNumber v-model="value" size="medium" :controls="true" controls-position="right" style="margin-bottom: 10px;" />
				<InputNumber v-model="value" size="large" :controls="true" controls-position="right" style="margin-bottom: 10px;" />
			</div>
		</div>
		`,
	}),
	args: {
		modelValue: 42,
	},
} satisfies Story;
