import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nToggle from './Toggle.vue';

const meta = {
	title: 'Core/Toggle',
	component: N8nToggle,
	argTypes: {
		variant: {
			control: 'select',
			options: ['solid', 'subtle', 'ghost', 'outline', 'destructive', 'success'],
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
		},
		disabled: { control: 'boolean' },
		label: { control: 'text' },
		icon: { control: 'text' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'An icon-only two-state button built on Reka UI Toggle and styled to match N8nButton variants and sizes. The label renders as both the accessible name and tooltip content.',
			},
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof N8nToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nToggle },
		setup() {
			const pressed = ref(false);
			return { args, pressed };
		},
		template: `
			<div style="display: grid; place-items: center;">
				<N8nToggle v-model="pressed" v-bind="args" />
			</div>
		`,
	}),
	args: {
		label: 'Toggle bold',
		icon: 'text',
		variant: 'solid',
		size: 'medium',
		disabled: false,
	},
};

export const Variants: Story = {
	args: { label: 'Toggle text' },
	render: () => ({
		components: { N8nToggle },
		setup() {
			const variants = ['solid', 'subtle', 'ghost', 'outline', 'destructive', 'success'];
			return { variants };
		},
		template: `
			<div style="display: flex; gap: 12px; align-items: center; justify-content: center;">
				<N8nToggle
					v-for="variant in variants"
					:key="variant"
					:variant="variant"
					:label="variant"
					icon="text"
					model-value
				/>
			</div>
		`,
	}),
};

export const Sizes: Story = {
	args: { label: 'Toggle text' },
	render: () => ({
		components: { N8nToggle },
		setup() {
			const sizes = ['xsmall', 'small', 'medium', 'large', 'xlarge'];
			return { sizes };
		},
		template: `
			<div style="display: flex; gap: 12px; align-items: center; justify-content: center;">
				<N8nToggle
					v-for="size in sizes"
					:key="size"
					:size="size"
					:label="size"
					icon="text"
				/>
			</div>
		`,
	}),
};
