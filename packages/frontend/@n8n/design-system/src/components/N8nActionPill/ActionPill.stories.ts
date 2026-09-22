import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nActionPill from './ActionPill.vue';

const meta = {
	title: 'Core/ActionPill',
	component: N8nActionPill,
	argTypes: {
		type: {
			control: 'select',
			options: ['default', 'info', 'danger'],
		},
		size: {
			control: 'select',
			options: ['small', 'medium'],
		},
		clickable: { control: 'boolean' },
		text: { control: 'text' },
		hoverText: { control: 'text' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'A small pill-shaped label that can optionally act as a button. Use for inline status indicators, counts, or short contextual labels.',
			},
		},
	},
} satisfies Meta<typeof N8nActionPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nActionPill },
		setup() {
			return { args };
		},
		template: '<N8nActionPill v-bind="args" />',
	}),
	args: {
		text: 'Free credits',
		type: 'default',
		size: 'medium',
		clickable: false,
	},
};

export const Variants: Story = {
	render: () => ({
		components: { N8nActionPill },
		template: `
			<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
				<N8nActionPill text="Free credits" type="default" />
				<N8nActionPill text="Gateway credits" type="info" />
				<N8nActionPill text="No credits" type="danger" />
			</div>
		`,
	}),
};

export const Sizes: Story = {
	render: () => ({
		components: { N8nActionPill },
		template: `
			<div style="display: flex; gap: 12px; align-items: center;">
				<N8nActionPill text="Small" size="small" />
				<N8nActionPill text="Medium" size="medium" />
			</div>
		`,
	}),
};

export const Clickable: Story = {
	render: (args) => ({
		components: { N8nActionPill },
		setup() {
			return { args };
		},
		template: '<N8nActionPill v-bind="args" />',
	}),
	args: {
		text: 'Free credits',
		clickable: true,
	},
};

export const HoverText: Story = {
	render: (args) => ({
		components: { N8nActionPill },
		setup() {
			return { args };
		},
		template: '<N8nActionPill v-bind="args" />',
	}),
	args: {
		text: 'No credits',
		hoverText: 'Top up',
		type: 'danger',
		clickable: true,
	},
};
