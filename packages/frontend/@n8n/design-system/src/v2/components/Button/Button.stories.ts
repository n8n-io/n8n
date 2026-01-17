/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { StoryObj } from '@storybook/vue3-vite';

import Button from './Button.vue';
import N8nIcon from '../../../components/N8nIcon/Icon.vue';

const meta = {
	title: 'Components v2/Button',
	component: Button,
	argTypes: {
		variant: {
			control: 'select',
			options: ['solid', 'subtle', 'outline', 'ghost', 'destructive'],
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'medium'],
		},
		loading: {
			control: 'boolean',
		},
		icon: {
			control: 'boolean',
		},
		disabled: {
			control: 'boolean',
		},
		href: {
			control: 'text',
		},
		default: {
			control: 'text',
			description: 'Button text content',
		},
	},
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
	render: (args) => ({
		components: { Button },
		setup() {
			return { args };
		},
		template: `
		<div style="display: grid; place-items: center;">
			<Button v-bind="args">{{ args.default }}</Button>
		</div>
		`,
	}),
	args: {
		variant: 'outline',
		size: 'medium',
		loading: false,
		default: 'Button',
	},
} satisfies Story;

export const Size = {
	render: (args) => ({
		components: { Button },
		setup() {
			return { args };
		},
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<Button variant="solid" size="xsmall">Button</Button>
				<Button variant="solid" size="small">Button</Button>
				<Button variant="solid" size="medium">Button</Button>
			</div>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const Variant = {
	render: (args) => ({
		components: { Button },
		setup() {
			return { args };
		},
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<Button variant="solid" size="medium">Solid</Button>
				<Button variant="subtle" size="medium">Subtle</Button>
				<Button variant="outline" size="medium">Outline</Button>
				<Button variant="ghost" size="medium">Ghost</Button>
				<Button variant="destructive" size="medium">Destructive</Button>
			</div>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const WithIcons = {
	render: (args) => ({
		components: { Button, N8nIcon },
		setup() {
			return { args };
		},
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<Button variant="solid" size="medium">
					<N8nIcon icon="plus" size="medium" />
					Button
				</Button>
				<Button variant="solid" size="medium">
					Button
					<N8nIcon icon="arrow-right" size="medium" />
				</Button>
				<Button variant="solid" size="medium">
					<N8nIcon icon="plus" size="medium" />
					Button
					<N8nIcon icon="chevron-down" size="medium" />
				</Button>
			</div>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const Loading = {
	render: (args) => ({
		components: { Button },
		setup() {
			return { args };
		},
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<Button variant="solid" size="medium" loading>Button</Button>
				<Button variant="subtle" size="medium" loading>Button</Button>
				<Button variant="outline" size="medium" loading>Button</Button>
				<Button variant="ghost" size="medium" loading>Button</Button>
				<Button variant="destructive" size="medium" loading>Button</Button>
			</div>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const Link = {
	render: (args) => ({
		components: { Button },
		setup() {
			return { args };
		},
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<Button variant="solid" size="medium" href="https://n8n.io">Link</Button>
				<Button variant="subtle" size="medium" href="https://n8n.io">Link</Button>
				<Button variant="outline" size="medium" href="https://n8n.io">Link</Button>
				<Button variant="ghost" size="medium" href="https://n8n.io">Link</Button>
				<Button variant="destructive" size="medium" href="https://n8n.io">Link</Button>
			</div>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const IconOnly = {
	render: (args) => ({
		components: { Button, N8nIcon },
		setup() {
			return { args };
		},
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<Button variant="solid" size="xsmall" icon aria-label="Add">
					<N8nIcon icon="plus" size="xsmall" />
				</Button>
				<Button variant="solid" size="small" icon aria-label="Add">
					<N8nIcon icon="plus" size="small" />
				</Button>
				<Button variant="solid" size="medium" icon aria-label="Add">
					<N8nIcon icon="plus" size="medium" />
				</Button>
			</div>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const Disabled = {
	render: (args) => ({
		components: { Button },
		setup() {
			return { args };
		},
		template: `
		<div style="display: grid; place-items: center;">
			<div style="display: flex; gap: 12px; align-items: center;">
				<Button variant="solid" size="medium" disabled>Solid</Button>
				<Button variant="subtle" size="medium" disabled>Subtle</Button>
				<Button variant="outline" size="medium" disabled>Outline</Button>
				<Button variant="ghost" size="medium" disabled>Ghost</Button>
				<Button variant="destructive" size="medium" disabled>Destructive</Button>
			</div>
		</div>
		`,
	}),
	args: {},
} satisfies Story;
