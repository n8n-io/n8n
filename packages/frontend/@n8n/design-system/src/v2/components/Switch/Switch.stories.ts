/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import Switch from './Switch.vue';

const meta = {
	title: 'Components v2/Switch',
	component: Switch,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		size: {
			control: 'select',
			options: ['small', 'large'],
		},
	},
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
	render: (args) => ({
		components: { Switch },
		setup() {
			const value = ref(args.modelValue);

			return {
				args,
				value,
			};
		},
		template: `
		<div style="padding: 40px;">
			<template v-for="isDisabled in [false, true]" :key="isDisabled">
				<h2 :style="{ margin: '20px 0' }">Disabled: {{ isDisabled }}</h2>
				<div :style="{ display: 'flex', flexDirection: 'column', gap: '12px' }">
					<Switch v-model="value" :disabled="isDisabled"/>
					<Switch :model-value="true" label="Checked" :disabled="isDisabled"/>
					<Switch :model-value="false" label="Unchecked" :disabled="isDisabled"/>
				</div>
			</template>

			<h2 :style="{ margin: '20px 0' }">Size Comparison</h2>
			<div :style="{ display: 'flex', flexDirection: 'column', gap: '12px' }">
				<Switch :model-value="true" label="Small size (default)" size="small"/>
				<Switch :model-value="true" label="Large size" size="large"/>
			</div>

			<h2 :style="{ margin: '20px 0' }">Long Labels</h2>
			<div :style="{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px' }">
				<Switch :model-value="true" label="Automatically Passthrough Binary Images"/>
				<Switch :model-value="false" label="Enable Advanced Security Features for This Workflow"/>
			</div>
		</div>
		`,
	}),
	args: {
		modelValue: false,
	},
} satisfies Story;

export const Sizes = {
	render: () => ({
		components: { Switch },
		setup() {
			const small = ref(true);
			const large = ref(true);
			return { small, large };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 16px;">
			<Switch v-model="small" label="Small size (for parameters panel)" size="small"/>
			<Switch v-model="large" label="Large size (for settings)" size="large"/>
		</div>
		`,
	}),
} satisfies Story;

export const States = {
	render: () => ({
		components: { Switch },
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 16px;">
			<Switch :model-value="false" label="Unchecked"/>
			<Switch :model-value="true" label="Checked"/>
			<Switch :model-value="false" label="Disabled unchecked" disabled/>
			<Switch :model-value="true" label="Disabled checked" disabled/>
		</div>
		`,
	}),
} satisfies Story;

export const WithCustomLabel = {
	render: () => ({
		components: { Switch },
		setup() {
			const value = ref(false);
			return { value };
		},
		template: `
		<div style="padding: 40px;">
			<Switch v-model="value">
				<template #label>
					I accept the <a href="#" style="color: var(--color--primary);">terms and conditions</a>
				</template>
			</Switch>
		</div>
		`,
	}),
} satisfies Story;
