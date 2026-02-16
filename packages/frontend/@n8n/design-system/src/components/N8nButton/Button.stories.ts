import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nButton from './Button.vue';
import N8nIcon from '../N8nIcon/Icon.vue';

const meta = {
	title: 'Atoms/Button',
	component: N8nButton,
	argTypes: {
		variant: {
			control: 'select',
			options: ['solid', 'subtle', 'ghost', 'outline', 'destructive'],
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
		iconOnly: {
			control: 'boolean',
			description: 'Makes button square (icon-only)',
		},
		href: {
			control: 'text',
			description: 'If provided, renders as a link',
		},
		// Hide internal props from the table
		icon: { table: { disable: true } },
		iconSize: { table: { disable: true } },
		label: { table: { disable: true } },
	},
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof N8nButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: grid; place-items: center;">
			<N8nButton v-bind="args">{{ args.default || 'Button' }}</N8nButton>
		</div>
		`,
	}),
	args: {
		variant: 'solid',
		size: 'medium',
		loading: false,
		default: 'Button',
	},
};

export const Variant: Story = {
	render: () => ({
		components: { N8nButton },
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<N8nButton variant="solid" size="medium">Solid</N8nButton>
				<N8nButton variant="subtle" size="medium">Subtle</N8nButton>
				<N8nButton variant="outline" size="medium">Outline</N8nButton>
				<N8nButton variant="ghost" size="medium">Ghost</N8nButton>
				<N8nButton variant="destructive" size="medium">Destructive</N8nButton>
			</div>
		</div>
		`,
	}),
	args: {},
};

export const Size: Story = {
	render: () => ({
		components: { N8nButton },
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<N8nButton variant="solid" size="xsmall">XSmall</N8nButton>
				<N8nButton variant="solid" size="small">Small</N8nButton>
				<N8nButton variant="solid" size="medium">Medium</N8nButton>
				<N8nButton variant="solid" size="large">Large</N8nButton>
				<N8nButton variant="solid" size="xlarge">XLarge</N8nButton>
			</div>
		</div>
		`,
	}),
	args: {},
};

export const WithIcons: Story = {
	render: () => ({
		components: { N8nButton, N8nIcon },
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<N8nButton variant="solid" size="medium">
					<N8nIcon icon="plus" size="medium" />
					Add Item
				</N8nButton>
				<N8nButton variant="solid" size="medium">
					Continue
					<N8nIcon icon="arrow-right" size="medium" />
				</N8nButton>
				<N8nButton variant="solid" size="medium">
					<N8nIcon icon="plus" size="medium" />
					Options
					<N8nIcon icon="chevron-down" size="medium" />
				</N8nButton>
			</div>
		</div>
		`,
	}),
	args: {},
};

export const Loading: Story = {
	render: () => ({
		components: { N8nButton },
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<N8nButton variant="solid" size="medium" loading>Solid</N8nButton>
				<N8nButton variant="subtle" size="medium" loading>Subtle</N8nButton>
				<N8nButton variant="outline" size="medium" loading>Outline</N8nButton>
				<N8nButton variant="ghost" size="medium" loading>Ghost</N8nButton>
				<N8nButton variant="destructive" size="medium" loading>Destructive</N8nButton>
			</div>
		</div>
		`,
	}),
	args: {},
};

export const Link: Story = {
	render: () => ({
		components: { N8nButton },
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<N8nButton variant="solid" size="medium" href="https://n8n.io">Link</N8nButton>
				<N8nButton variant="subtle" size="medium" href="https://n8n.io">Link</N8nButton>
				<N8nButton variant="outline" size="medium" href="https://n8n.io">Link</N8nButton>
				<N8nButton variant="ghost" size="medium" href="https://n8n.io">Link</N8nButton>
				<N8nButton variant="destructive" size="medium" href="https://n8n.io">Link</N8nButton>
			</div>
		</div>
		`,
	}),
	args: {},
};

export const IconOnly: Story = {
	render: () => ({
		components: { N8nButton, N8nIcon },
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<N8nButton variant="solid" size="xsmall" icon-only aria-label="Add">
					<N8nIcon icon="plus" size="xsmall" />
				</N8nButton>
				<N8nButton variant="solid" size="small" icon-only aria-label="Add">
					<N8nIcon icon="plus" size="small" />
				</N8nButton>
				<N8nButton variant="solid" size="medium" icon-only aria-label="Add">
					<N8nIcon icon="plus" size="medium" />
				</N8nButton>
			</div>
		</div>
		`,
	}),
	args: {},
};

export const Disabled: Story = {
	render: () => ({
		components: { N8nButton },
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<N8nButton variant="solid" size="medium" disabled>Solid</N8nButton>
				<N8nButton variant="subtle" size="medium" disabled>Subtle</N8nButton>
				<N8nButton variant="outline" size="medium" disabled>Outline</N8nButton>
				<N8nButton variant="ghost" size="medium" disabled>Ghost</N8nButton>
				<N8nButton variant="destructive" size="medium" disabled>Destructive</N8nButton>
			</div>
		</div>
		`,
	}),
	args: {},
};

/**
 * ## Migration from `type` to `variant`
 *
 * The `type` prop is deprecated. Use `variant` instead with this mapping:
 *
 * | Legacy `type` | Current `variant` |
 * |---------------|-------------------|
 * | `primary`     | `solid`           |
 * | `secondary`   | `subtle`          |
 * | `tertiary`    | `ghost`           |
 * | `danger`      | `destructive`     |
 *
 * Additionally:
 * - `outline` prop → `variant="outline"`
 * - `text` prop → `variant="ghost"`
 */
export const TypeToVariantMapping: Story = {
	render: () => ({
		components: { N8nButton },
		template: `
		<div style="display: grid; gap: 24px;">
			<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; align-items: center; font-family: var(--font-family); font-size: var(--font-size--sm);">
				<strong>Legacy type</strong>
				<strong>Current variant</strong>
				<strong>Result</strong>

				<code>type="primary"</code>
				<code>variant="solid"</code>
				<N8nButton variant="solid">Solid</N8nButton>

				<code>type="secondary"</code>
				<code>variant="subtle"</code>
				<N8nButton variant="subtle">Subtle</N8nButton>

				<code>type="tertiary"</code>
				<code>variant="ghost"</code>
				<N8nButton variant="ghost">Ghost</N8nButton>

				<code>type="danger"</code>
				<code>variant="destructive"</code>
				<N8nButton variant="destructive">Destructive</N8nButton>

				<code>outline</code>
				<code>variant="outline"</code>
				<N8nButton variant="outline">Outline</N8nButton>

				<code>text</code>
				<code>variant="ghost"</code>
				<N8nButton variant="ghost">Ghost</N8nButton>
			</div>
		</div>
		`,
	}),
	args: {},
};
