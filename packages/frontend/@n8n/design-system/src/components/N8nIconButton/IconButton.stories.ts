import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nIconButton from './IconButton.vue';

const meta = {
	title: 'Core/IconButton',
	component: N8nIconButton,
	argTypes: {
		icon: {
			control: 'text',
		},
		variant: {
			control: 'select',
			options: ['solid', 'subtle', 'ghost', 'outline', 'destructive', 'success'],
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
		},
		loading: {
			control: 'boolean',
		},
		disabled: {
			control: 'boolean',
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'An icon-only button. Prefer wrapping with `N8nTooltip` and always provide an accessible `aria-label`.',
			},
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof N8nIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nIconButton },
		setup() {
			return { args };
		},
		template: '<N8nIconButton v-bind="args" aria-label="Create" />',
	}),
	args: {
		icon: 'plus',
		variant: 'solid',
		size: 'medium',
	},
};

export const Variants: Story = {
	render: () => ({
		components: { N8nIconButton },
		template: `
			<div style="display: flex; gap: var(--spacing--xs); align-items: center; flex-wrap: wrap;">
				<N8nIconButton icon="plus" aria-label="Create" variant="solid" />
				<N8nIconButton icon="plus" aria-label="Create" variant="subtle" />
				<N8nIconButton icon="plus" aria-label="Create" variant="outline" />
				<N8nIconButton icon="plus" aria-label="Create" variant="ghost" />
				<N8nIconButton icon="trash-2" aria-label="Delete" variant="destructive" />
				<N8nIconButton icon="check" aria-label="Confirm" variant="success" />
			</div>
		`,
	}),
	args: {
		icon: 'plus',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { N8nIconButton },
		template: `
			<div style="display: flex; gap: var(--spacing--xs); align-items: center; flex-wrap: wrap;">
				<N8nIconButton icon="plus" aria-label="Create" variant="solid" size="xsmall" />
				<N8nIconButton icon="plus" aria-label="Create" variant="solid" size="small" />
				<N8nIconButton icon="plus" aria-label="Create" variant="solid" size="medium" />
				<N8nIconButton icon="plus" aria-label="Create" variant="solid" size="large" />
				<N8nIconButton icon="plus" aria-label="Create" variant="solid" size="xlarge" />
			</div>
		`,
	}),
	args: {
		icon: 'plus',
	},
};

export const States: Story = {
	render: () => ({
		components: { N8nIconButton },
		template: `
			<div style="display: flex; gap: var(--spacing--xs); align-items: center; flex-wrap: wrap;">
				<N8nIconButton icon="plus" aria-label="Create" variant="solid" />
				<N8nIconButton icon="plus" aria-label="Create" variant="solid" :loading="true" />
				<N8nIconButton icon="plus" aria-label="Create" variant="solid" :disabled="true" />
			</div>
		`,
	}),
	args: {
		icon: 'plus',
	},
};
