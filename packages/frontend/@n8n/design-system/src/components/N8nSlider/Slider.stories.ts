import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import type { SliderValue } from './Slider.types';
import Slider from './Slider.vue';

const meta = {
	title: 'Core/Slider',
	component: Slider,
	argTypes: {
		size: {
			control: 'select',
			options: ['mini', 'small', 'medium', 'large', 'xlarge'],
		},
	},
	args: {
		label: 'Volume',
		defaultValue: [50],
		size: 'large',
	},
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mini: Story = { args: { size: 'mini' } };
export const Small: Story = { args: { size: 'small' } };
export const Medium: Story = { args: { size: 'medium' } };
export const Large: Story = { args: { size: 'large' } };
export const Xlarge: Story = { args: { size: 'xlarge' } };

export const Controlled: Story = {
	args: {
		defaultValue: [20],
	},
	render: (args) => ({
		components: { Slider },
		setup() {
			const value = ref<SliderValue>(args.defaultValue ?? [20]);
			return { args, value };
		},
		template: '<Slider v-bind="args" v-model="value" />',
	}),
};

export const StepMarkers: Story = {
	args: {
		label: 'Volume',
		defaultValue: [50],
		showStepMarkers: true,
		step: 10,
	},
};

export const NonZeroMinimum: Story = {
	args: {
		minValue: 20,
		maxValue: 120,
		defaultValue: [70],
		step: 10,
		showStepMarkers: true,
	},
};

export const Formatted: Story = {
	args: {
		label: 'Opacity',
		minValue: 0,
		maxValue: 1,
		step: 0.1,
		defaultValue: [0.5],
		formatValue: (value) => `${Math.round(value * 100)}%`,
	},
};

export const HiddenLabel: Story = {
	args: { hideLabel: true },
};

export const HiddenValue: Story = {
	args: { hideValue: true },
};

export const Disabled: Story = {
	args: { disabled: true },
};

export const CustomLabel: Story = {
	render: (args) => ({
		components: { Slider },
		setup() {
			return { args };
		},
		template:
			'<Slider v-bind="args"><template #label><strong>{{ args.label }}</strong></template></Slider>',
	}),
};

export const AccessibleLabelOnly: Story = {
	args: { label: undefined, ariaLabel: 'Volume', hideValue: true },
};

export const ExternalLabel: Story = {
	args: { label: undefined, ariaLabelledby: 'external-volume-label' },
	render: (args) => ({
		components: { Slider },
		setup() {
			return { args };
		},
		template: '<div><span id="external-volume-label">Volume</span><Slider v-bind="args" /></div>',
	}),
};
