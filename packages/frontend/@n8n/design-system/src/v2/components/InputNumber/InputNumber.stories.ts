import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { defineComponent, reactive, ref } from 'vue';

import InputNumber from './InputNumber.vue';
import N8nIcon from '../../../components/N8nIcon/Icon.vue';
import N8nInputLabel from '../../../components/N8nInputLabel/InputLabel.vue';
import N8nText from '../../../components/N8nText/Text.vue';

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
		controls: true,
		controlsPosition: 'right',
		disabled: false,
		placeholder: 'Enter a number',
	},
} satisfies Meta<typeof InputNumber>;

export default meta;

type Story = StoryObj<typeof meta>;

const storyPadding = 'padding: var(--spacing--xl);';
const storyStack = `${storyPadding} display: flex; flex-direction: column; gap: var(--spacing--md); max-width: 320px;`;

export const Default = {
	render: (args) => ({
		components: { InputNumber },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyPadding} max-width: 320px;">
			<InputNumber v-bind="args" v-model="value" />
		</div>
		`,
	}),
} satisfies Story;

const InputNumberControlledUncontrolledDemo = defineComponent({
	name: 'InputNumberControlledUncontrolledDemo',
	components: { InputNumber, N8nInputLabel, N8nText },
	setup() {
		const value = ref(5);
		return { value, onUpdate: action('update:modelValue') };
	},
	template: `
		<div style="padding: var(--spacing--xl); display: flex; flex-direction: column; gap: var(--spacing--xl); max-width: 360px;">
			<section style="display: flex; flex-direction: column; gap: var(--spacing--xs);">
				<N8nInputLabel label="Controlled" />
				<N8nText size="small" color="text-light">
					Parent-controlled value via <code>v-model</code>. Use the buttons below to set the value externally.
				</N8nText>
				<InputNumber
					key="controlled"
					v-model="value"
					:min="0"
					:max="10"
					:controls="true"
					controls-position="both"
					@update:model-value="onUpdate"
				/>
				<div style="display: flex; gap: var(--spacing--2xs); flex-wrap: wrap;">
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
				<N8nText size="small">Selected: <strong>{{ value }}</strong></N8nText>
			</section>
			<section style="display: flex; flex-direction: column; gap: var(--spacing--xs);">
				<N8nInputLabel label="Uncontrolled" />
				<N8nText size="small" color="text-light">
					Initial value set with <code>defaultValue="3"</code>. The parent does not track changes.
				</N8nText>
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
	render: (args) => ({
		components: { InputNumber },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyPadding} max-width: 320px;">
			<InputNumber v-bind="args" v-model="value" :controls="true" controls-position="both" />
		</div>
		`,
	}),
	args: {
		modelValue: 5,
		min: 0,
		max: 10,
		controls: true,
		controlsPosition: 'both',
	},
} satisfies Story;

export const NoControls = {
	render: (args) => ({
		components: { InputNumber },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyPadding} max-width: 320px;">
			<InputNumber v-bind="args" v-model="value" :controls="false" />
		</div>
		`,
	}),
	args: {
		modelValue: 5,
		min: 0,
		max: 10,
		controls: false,
	},
} satisfies Story;

export const Sizes = {
	render: () => ({
		components: { InputNumber, N8nInputLabel },
		setup() {
			const withoutControls = reactive({
				mini: 42,
				small: 42,
				medium: 42,
				large: 42,
				xlarge: 42,
			});
			const controlsBoth = reactive({
				mini: 42,
				small: 42,
				medium: 42,
				large: 42,
				xlarge: 42,
			});
			const controlsRight = reactive({
				mini: 42,
				small: 42,
				medium: 42,
				large: 42,
				xlarge: 42,
			});
			return { withoutControls, controlsBoth, controlsRight };
		},
		template: `
		<div style="${storyPadding} display: flex; gap: var(--spacing--xl); flex-wrap: wrap;">
			<div style="width: 200px; display: flex; flex-direction: column; gap: var(--spacing--xs);">
				<N8nInputLabel label="Without controls" />
				<InputNumber v-model="withoutControls.mini" size="mini" placeholder="mini" :controls="false" />
				<InputNumber v-model="withoutControls.small" size="small" placeholder="small" :controls="false" />
				<InputNumber v-model="withoutControls.medium" size="medium" placeholder="medium" :controls="false" />
				<InputNumber v-model="withoutControls.large" size="large" placeholder="large" :controls="false" />
				<InputNumber v-model="withoutControls.xlarge" size="xlarge" placeholder="xlarge" :controls="false" />
			</div>
			<div style="width: 200px; display: flex; flex-direction: column; gap: var(--spacing--xs);">
				<N8nInputLabel label="With controls (both)" />
				<InputNumber v-model="controlsBoth.mini" size="mini" :controls="true" controls-position="both" />
				<InputNumber v-model="controlsBoth.small" size="small" :controls="true" controls-position="both" />
				<InputNumber v-model="controlsBoth.medium" size="medium" :controls="true" controls-position="both" />
				<InputNumber v-model="controlsBoth.large" size="large" :controls="true" controls-position="both" />
				<InputNumber v-model="controlsBoth.xlarge" size="xlarge" :controls="true" controls-position="both" />
			</div>
			<div style="width: 200px; display: flex; flex-direction: column; gap: var(--spacing--xs);">
				<N8nInputLabel label="With controls (right)" />
				<InputNumber v-model="controlsRight.mini" size="mini" :controls="true" controls-position="right" />
				<InputNumber v-model="controlsRight.small" size="small" :controls="true" controls-position="right" />
				<InputNumber v-model="controlsRight.medium" size="medium" :controls="true" controls-position="right" />
				<InputNumber v-model="controlsRight.large" size="large" :controls="true" controls-position="right" />
				<InputNumber v-model="controlsRight.xlarge" size="xlarge" :controls="true" controls-position="right" />
			</div>
		</div>
		`,
	}),
} satisfies Story;

export const Precision = {
	render: () => ({
		components: { InputNumber, N8nInputLabel },
		setup() {
			const withoutControls = reactive({
				none: 3.14159,
				two: 3.14,
				one: 3.1,
				zero: 3,
			});
			const controlsBoth = reactive({
				none: 3.14159,
				two: 3.14,
				one: 3.1,
				zero: 3,
			});
			const controlsRight = reactive({
				none: 3.14159,
				two: 3.14,
				one: 3.1,
				zero: 3,
			});
			return { withoutControls, controlsBoth, controlsRight };
		},
		template: `
		<div style="${storyPadding} display: flex; gap: var(--spacing--xl); flex-wrap: wrap;">
			<div style="width: 200px; display: flex; flex-direction: column; gap: var(--spacing--xs);">
				<N8nInputLabel label="Without controls" />
				<InputNumber v-model="withoutControls.none" placeholder="No precision" :controls="false" />
				<InputNumber v-model="withoutControls.two" :precision="2" placeholder="Precision: 2" :controls="false" />
				<InputNumber v-model="withoutControls.one" :precision="1" placeholder="Precision: 1" :controls="false" />
				<InputNumber v-model="withoutControls.zero" :precision="0" placeholder="Precision: 0" :controls="false" />
			</div>
			<div style="width: 200px; display: flex; flex-direction: column; gap: var(--spacing--xs);">
				<N8nInputLabel label="With controls (both)" />
				<InputNumber
					v-model="controlsBoth.none"
					:controls="true"
					controls-position="both"
				/>
				<InputNumber
					v-model="controlsBoth.two"
					:precision="2"
					:step="0.01"
					:controls="true"
					controls-position="both"
				/>
				<InputNumber
					v-model="controlsBoth.one"
					:precision="1"
					:step="0.1"
					:controls="true"
					controls-position="both"
				/>
				<InputNumber
					v-model="controlsBoth.zero"
					:precision="0"
					:controls="true"
					controls-position="both"
				/>
			</div>
			<div style="width: 200px; display: flex; flex-direction: column; gap: var(--spacing--xs);">
				<N8nInputLabel label="With controls (right)" />
				<InputNumber
					v-model="controlsRight.none"
					:controls="true"
					controls-position="right"
				/>
				<InputNumber
					v-model="controlsRight.two"
					:precision="2"
					:step="0.01"
					:controls="true"
					controls-position="right"
				/>
				<InputNumber
					v-model="controlsRight.one"
					:precision="1"
					:step="0.1"
					:controls="true"
					controls-position="right"
				/>
				<InputNumber
					v-model="controlsRight.zero"
					:precision="0"
					:controls="true"
					controls-position="right"
				/>
			</div>
		</div>
		`,
	}),
} satisfies Story;

export const MinMax = {
	name: 'Min/Max',
	render: () => ({
		components: { InputNumber, N8nInputLabel },
		setup() {
			const minValue = ref(5);
			const maxValue = ref(50);
			return { minValue, maxValue };
		},
		template: `
		<div style="${storyStack}">
			<N8nInputLabel label="Min = 0">
				<InputNumber v-model="minValue" :min="0" :controls="true" controls-position="both" />
			</N8nInputLabel>
			<N8nInputLabel label="Max = 100">
				<InputNumber v-model="maxValue" :max="100" :controls="true" controls-position="both" />
			</N8nInputLabel>
		</div>
		`,
	}),
} satisfies Story;

export const Disabled = {
	render: () => ({
		components: { InputNumber, N8nInputLabel },
		setup() {
			const withoutControls = ref(42);
			const controlsBoth = ref(42);
			const controlsRight = ref(42);
			return { withoutControls, controlsBoth, controlsRight };
		},
		template: `
		<div style="${storyStack}">
			<N8nInputLabel label="Without controls">
				<InputNumber v-model="withoutControls" placeholder="Disabled" :disabled="true" :controls="false" />
			</N8nInputLabel>
			<N8nInputLabel label="With controls (both)">
				<InputNumber
					v-model="controlsBoth"
					:controls="true"
					controls-position="both"
					:disabled="true"
				/>
			</N8nInputLabel>
			<N8nInputLabel label="With controls (right)">
				<InputNumber
					v-model="controlsRight"
					:controls="true"
					controls-position="right"
					:disabled="true"
				/>
			</N8nInputLabel>
		</div>
		`,
	}),
} satisfies Story;

export const CustomButtons = {
	render: (args) => ({
		components: { InputNumber, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyPadding} max-width: 320px;">
			<InputNumber v-bind="args" v-model="value" :controls="true" controls-position="both">
				<template #decrement="{ ui }">
					<button type="button" :class="ui.class" aria-label="Decrease">
						<N8nIcon icon="chevron-left" size="small" />
					</button>
				</template>
				<template #increment="{ ui }">
					<button type="button" :class="ui.class" aria-label="Increase">
						<N8nIcon icon="chevron-right" size="small" />
					</button>
				</template>
			</InputNumber>
		</div>
		`,
	}),
	args: {
		modelValue: 5,
		min: 1,
		max: 99,
		controls: true,
		controlsPosition: 'both',
	},
} satisfies Story;
