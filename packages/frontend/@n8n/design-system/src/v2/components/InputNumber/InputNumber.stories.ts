import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { defineComponent, ref } from 'vue';

import InputNumber from './InputNumber.vue';
import N8nIcon from '../../../components/N8nIcon/Icon.vue';

const meta = {
	title: 'Experimental/InputNumber',
	component: InputNumber,
	parameters: {
		docs: {
			description: {
				component:
					'Number input built on Reka UI NumberField. Visual affordances match `N8nInput` (shared input size/theme tokens, inset border, focus ring).',
			},
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		modelValue: { control: 'number' },
		defaultValue: {
			control: 'number',
			description: 'Initial value when used without v-model (uncontrolled)',
		},
		size: {
			control: 'select',
			options: ['mini', 'small', 'medium', 'large', 'xlarge'],
		},
		min: { control: 'number' },
		max: { control: 'number' },
		step: { control: 'number' },
		precision: { control: 'number' },
		controls: { control: 'boolean' },
		controlsPosition: {
			control: 'select',
			options: ['both', 'right'],
		},
		disabled: { control: 'boolean' },
		placeholder: { control: 'text' },
	},
	args: {
		modelValue: 0,
		size: 'medium',
		controls: false,
		controlsPosition: 'right',
		disabled: false,
		placeholder: 'Enter a number',
	},
} satisfies Meta<typeof InputNumber>;

export default meta;

type Story = StoryObj<typeof meta>;

const withLiveValue = (template: string) => ({
	render: (args: Story['args']) => ({
		components: { InputNumber, N8nIcon },
		setup() {
			const value = ref(args?.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; max-width: 320px;">
			${template}
			<p style="margin-top: 16px;">Value: {{ value }}</p>
		</div>
		`,
	}),
});

export const Basic = {
	...withLiveValue('<InputNumber v-bind="args" v-model="value" />'),
} satisfies Story;

const InputNumberControlledUncontrolledDemo = defineComponent({
	name: 'InputNumberControlledUncontrolledDemo',
	components: { InputNumber },
	setup() {
		const value = ref(5);
		return { value, onUpdate: action('update:modelValue') };
	},
	template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 32px; max-width: 360px;">
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Controlled</h3>
				<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
					Parent-controlled value via <code>v-model</code>. Use the buttons below to set the value externally.
				</p>
				<InputNumber
					key="controlled"
					v-model="value"
					:min="0"
					:max="10"
					:controls="true"
					controls-position="both"
					@update:model-value="onUpdate"
				/>
				<div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
					<button type="button" style="padding: 4px 12px; font-size: 13px; cursor: pointer;" @click="value = 0">
						Set to 0
					</button>
					<button type="button" style="padding: 4px 12px; font-size: 13px; cursor: pointer;" @click="value = 5">
						Set to 5
					</button>
					<button type="button" style="padding: 4px 12px; font-size: 13px; cursor: pointer;" @click="value = 10">
						Set to 10
					</button>
				</div>
				<p style="margin-top: 16px; font-size: 14px;">Selected: <strong>{{ value }}</strong></p>
			</section>
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Uncontrolled</h3>
				<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
					Initial value set with <code>defaultValue="3"</code>. The parent does not track changes.
				</p>
				<InputNumber
					key="uncontrolled"
					:default-value="3"
					:min="0"
					:max="10"
					:controls="true"
					controls-position="both"
				/>
			</section>
		</div>
	`,
});

export const ControlledUncontrolled: Story = {
	name: 'Controlled/Uncontrolled',
	render: () => ({
		components: { InputNumberControlledUncontrolledDemo },
		template: '<InputNumberControlledUncontrolledDemo />',
	}),
};

export const WithControlsBoth = {
	...withLiveValue(
		'<InputNumber v-bind="args" v-model="value" :controls="true" controls-position="both" />',
	),
	args: {
		modelValue: 5,
		min: 0,
		max: 10,
		controls: true,
		controlsPosition: 'both',
	},
} satisfies Story;

export const WithControlsRight = {
	...withLiveValue(
		'<InputNumber v-bind="args" v-model="value" :controls="true" controls-position="right" />',
	),
	args: {
		modelValue: 5,
		min: 0,
		max: 10,
		controls: true,
		controlsPosition: 'right',
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
		<div style="padding: 40px; max-width: 320px; display: flex; flex-direction: column; gap: 12px;">
			<InputNumber v-model="value" size="mini" placeholder="mini" />
			<InputNumber v-model="value" size="small" placeholder="small" />
			<InputNumber v-model="value" size="medium" placeholder="medium" />
			<InputNumber v-model="value" size="large" placeholder="large" />
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
			const anyDecimals = ref(args.modelValue);
			const twoDecimals = ref(3.14);
			const integersOnly = ref(3);
			return { anyDecimals, twoDecimals, integersOnly };
		},
		template: `
		<div style="padding: 40px; max-width: 320px; display: flex; flex-direction: column; gap: 16px;">
			<div>
				<p>No precision</p>
				<InputNumber v-model="anyDecimals" placeholder="Any decimals" />
			</div>
			<div>
				<p>Precision: 2</p>
				<InputNumber v-model="twoDecimals" :precision="2" placeholder="0.00" />
			</div>
			<div>
				<p>Precision: 0</p>
				<InputNumber v-model="integersOnly" :precision="0" placeholder="0" />
			</div>
		</div>
		`,
	}),
	args: {
		modelValue: 3.14159,
	},
} satisfies Story;

export const MinMax = {
	...withLiveValue(
		'<InputNumber v-bind="args" v-model="value" :controls="true" controls-position="both" />',
	),
	args: {
		modelValue: 50,
		min: 0,
		max: 100,
		step: 10,
		controls: true,
		controlsPosition: 'both',
	},
} satisfies Story;

export const Disabled = {
	render: () => ({
		components: { InputNumber },
		setup() {
			const value = ref(42);
			return { value };
		},
		template: `
		<div style="display: flex; gap: 16px; align-items: flex-start; padding: 40px;">
			<div style="width: 160px;">
				<p>Default</p>
				<InputNumber v-model="value" placeholder="Enabled" />
			</div>
			<div style="width: 160px;">
				<p>Disabled</p>
				<InputNumber v-model="value" placeholder="Disabled" :disabled="true" />
			</div>
		</div>
		`,
	}),
} satisfies Story;

export const CustomButtons = {
	...withLiveValue(`
		<InputNumber v-bind="args" v-model="value" :controls="true" controls-position="both">
			<template #decrement>
				<N8nIcon icon="minus" size="small" />
			</template>
			<template #increment>
				<N8nIcon icon="plus" size="small" />
			</template>
		</InputNumber>
	`),
	args: {
		modelValue: 5,
		min: 1,
		max: 99,
		controls: true,
		controlsPosition: 'both',
	},
} satisfies Story;

export const ControlsSizes = {
	render: () => ({
		components: { InputNumber },
		setup() {
			const value = ref(42);
			return { value };
		},
		template: `
		<div style="padding: 40px; display: flex; gap: 32px;">
			<div style="width: 200px; display: flex; flex-direction: column; gap: 10px;">
				<p>Both (left/right)</p>
				<InputNumber v-model="value" size="mini" :controls="true" controls-position="both" />
				<InputNumber v-model="value" size="small" :controls="true" controls-position="both" />
				<InputNumber v-model="value" size="medium" :controls="true" controls-position="both" />
				<InputNumber v-model="value" size="large" :controls="true" controls-position="both" />
			</div>
			<div style="width: 200px; display: flex; flex-direction: column; gap: 10px;">
				<p>Right (stacked)</p>
				<InputNumber v-model="value" size="mini" :controls="true" controls-position="right" />
				<InputNumber v-model="value" size="small" :controls="true" controls-position="right" />
				<InputNumber v-model="value" size="medium" :controls="true" controls-position="right" />
				<InputNumber v-model="value" size="large" :controls="true" controls-position="right" />
			</div>
		</div>
		`,
	}),
} satisfies Story;
