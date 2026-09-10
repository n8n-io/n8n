import type { Meta, StoryObj } from '@storybook/vue3-vite';

import { BADGE_SIZE } from './Badge.type';
import N8nBadge from './Badge.vue';

const BADGE_VARIANTS = [
	'filled',
	'primary',
	'secondary',
	'subtle',
	'outline',
	'ghost',
	'warning',
	'danger',
	'success',
	'info',
] as const;

const VARIANT_EXAMPLES = [
	{ variant: 'filled', label: 'Draft', icon: 'file' },
	{ variant: 'primary', label: 'New', icon: 'sparkles' },
	{ variant: 'secondary', label: 'AI generated', icon: 'bot' },
	{ variant: 'subtle', label: 'Shared', icon: 'users' },
	{ variant: 'outline', label: 'Archived', icon: 'archive' },
	{ variant: 'ghost', label: 'Optional', icon: 'circle-dashed' },
	{ variant: 'warning', label: 'Needs setup', icon: 'triangle-alert' },
	{ variant: 'danger', label: 'Failed', icon: 'circle-x' },
	{ variant: 'success', label: 'Active', icon: 'circle-check' },
	{ variant: 'info', label: 'Information', icon: 'info' },
] as const;

const ICON_EXAMPLES = [
	{ label: 'Best version', leadingIcon: 'star' },
	{ label: 'Dependency', leadingIcon: 'link' },
	{ label: '3 attachments', leadingIcon: 'paperclip' },
	{ label: 'Open workflow', trailingIcon: 'external-link' },
] as const;

const meta = {
	title: 'Core/Badge',
	component: N8nBadge,
	argTypes: {
		variant: {
			control: 'select',
			options: BADGE_VARIANTS,
		},
		size: {
			control: 'select',
			options: BADGE_SIZE,
		},
		clickable: {
			control: 'boolean',
		},
		default: { control: 'text' },
	},
	parameters: {
		docs: {
			description: { component: 'A compact status label for highlighting state or metadata.' },
		},
	},
} satisfies Meta<typeof N8nBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: function renderBadge(args) {
		return {
			setup: function setup() {
				return { args };
			},
			components: { N8nBadge },
			template: '<N8nBadge v-bind="args">{{ args.default }}</N8nBadge>',
		};
	},
	args: {
		variant: 'filled',
		size: 'small',
		clickable: false,
		default: 'Badge',
	},
};

export const Variants: Story = {
	render: function renderAllVariants() {
		return {
			setup: function setup() {
				return { examples: VARIANT_EXAMPLES };
			},
			components: { N8nBadge },
			template: `
				<div style="display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing--sm)">
					<N8nBadge
						v-for="example in examples"
						:key="example.variant"
						:variant="example.variant"
						:leading-icon="example.icon"
					>
						{{ example.label }}
					</N8nBadge>
				</div>
			`,
		};
	},
};

export const Sizes: Story = {
	render: function renderAllSizes() {
		return {
			setup: function setup() {
				return { sizes: BADGE_SIZE };
			},
			components: { N8nBadge },
			template: `
				<div style="display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing--sm)">
					<N8nBadge
						v-for="size in sizes"
						:key="size"
						:size="size"
						leading-icon="circle-check"
						variant="success"
					>
						Active
					</N8nBadge>
				</div>
			`,
		};
	},
};

export const WithIcons: Story = {
	render: function renderWithIcons() {
		return {
			setup: function setup() {
				return { examples: ICON_EXAMPLES };
			},
			components: { N8nBadge },
			template: `
				<div style="display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing--sm)">
					<N8nBadge
						v-for="example in examples"
						:key="example.label"
						:leading-icon="example.leadingIcon"
						:trailing-icon="example.trailingIcon"
					>
						{{ example.label }}
					</N8nBadge>
				</div>
			`,
		};
	},
};

export const Clickable: Story = {
	render: function renderClickable() {
		return {
			components: { N8nBadge },
			template: `
				<div style="display: flex; align-items: center; gap: var(--spacing--sm)">
					<N8nBadge clickable leading-icon="list-filter">Filter applied</N8nBadge>
					<N8nBadge clickable disabled leading-icon="lock">Locked</N8nBadge>
				</div>
			`,
		};
	},
};
