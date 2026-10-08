import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nSpinner from './Spinner.vue';

const meta = {
	title: 'Core/Spinner',
	component: N8nSpinner,
	argTypes: {
		type: {
			control: 'select',
			options: ['dots', 'ring'],
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A loading spinner for inline and block loading states.',
			},
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof N8nSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nSpinner },
		setup() {
			return { args };
		},
		template: '<N8nSpinner v-bind="args" />',
	}),
	args: {
		type: 'dots',
		size: 'medium',
	},
};

export const Variants = {
	render: () => ({
		components: { N8nSpinner },
		template: `
			<div style="display: flex; align-items: center; gap: var(--spacing--lg); flex-wrap: wrap;">
				<div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing--2xs);">
					<N8nSpinner type="dots" size="medium" />
					<span>dots</span>
				</div>
				<div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing--2xs);">
					<N8nSpinner type="ring" size="medium" />
					<span>ring</span>
				</div>
			</div>
		`,
	}),
} satisfies Story;

export const Sizes = {
	render: () => ({
		components: { N8nSpinner },
		template: `
			<div style="display: flex; align-items: center; gap: var(--spacing--sm); flex-wrap: wrap;">
				<N8nSpinner type="dots" size="small" />
				<N8nSpinner type="dots" size="medium" />
				<N8nSpinner type="dots" size="large" />
				<N8nSpinner type="ring" size="small" />
				<N8nSpinner type="ring" size="medium" />
				<N8nSpinner type="ring" size="large" />
			</div>
		`,
	}),
} satisfies Story;
