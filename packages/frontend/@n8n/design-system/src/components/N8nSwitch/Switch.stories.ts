/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import Switch from './Switch.vue';

const meta = {
	title: 'Core/Switch',
	component: Switch,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		modelValue: { control: 'boolean' },
		disabled: { control: 'boolean' },
		label: { control: 'text' },
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
			return { args };
		},
		template: `
		<div>
			<Switch
				:model-value="args.modelValue"
				:label="args.label"
				:disabled="args.disabled"
				:size="args.size"
				@update:model-value="args.modelValue = $event"
			/>
		</div>
		`,
	}),
	args: {
		modelValue: false,
		label: 'Label',
		disabled: false,
		size: 'small',
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
		<div style="display: flex; flex-direction: column; gap: 16px">
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
		<div style="display: flex; flex-direction: column; gap: 16px">
			<Switch :model-value="false" label="Unchecked"/>
			<Switch :model-value="true" label="Checked"/>
			<Switch :model-value="false" label="Disabled unchecked" disabled/>
			<Switch :model-value="true" label="Disabled checked" disabled/>
		</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'All visual states. Hovering a non-disabled switch stretches the thumb slightly along the track, anchored to its side. Disabled switches do not react to hover.',
			},
		},
	},
} satisfies Story;

export const WithCustomLabel = {
	render: () => ({
		components: { Switch },
		setup() {
			const value = ref(false);
			return { value };
		},
		template: `
		<div>
			<Switch v-model="value">
				<template #label>
					I accept the <a href="#" style="color: var(--color--primary);">terms and conditions</a>
				</template>
			</Switch>
		</div>
		`,
	}),
} satisfies Story;
