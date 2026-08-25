import type { StoryFn } from '@storybook/vue3-vite';

import { BADGE_SIZE } from './Badge.type';
import N8nBadge from './Badge.vue';

const BADGE_VARIANTS = [
	'default',
	'primary',
	'secondary',
	'subtle',
	'outline',
	'ghost',
	'warning',
	'danger',
	'success',
] as const;

const VARIANT_EXAMPLES = [
	{ variant: 'default', label: 'Draft', icon: 'file' },
	{ variant: 'primary', label: 'New', icon: 'sparkles' },
	{ variant: 'secondary', label: 'AI generated', icon: 'bot' },
	{ variant: 'subtle', label: 'Shared', icon: 'users' },
	{ variant: 'outline', label: 'Archived', icon: 'archive' },
	{ variant: 'ghost', label: 'Optional', icon: 'circle-dashed' },
	{ variant: 'warning', label: 'Needs setup', icon: 'triangle-alert' },
	{ variant: 'danger', label: 'Failed', icon: 'circle-x' },
	{ variant: 'success', label: 'Active', icon: 'circle-check' },
] as const;

const ICON_EXAMPLES = [
	{ label: 'Best version', leadingIcon: 'star' },
	{ label: 'Dependency', leadingIcon: 'link' },
	{ label: '3 attachments', leadingIcon: 'paperclip' },
	{ label: 'Open workflow', trailingIcon: 'external-link' },
] as const;

export default {
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
	},
	parameters: {
		docs: {
			description: { component: 'A compact status label for highlighting state or metadata.' },
		},
	},
};

const Template: StoryFn = function renderBadge(args) {
	return {
		setup: function setup() {
			return { args };
		},
		components: {
			N8nBadge,
		},
		template: '<N8nBadge v-bind="args">Badge</N8nBadge>',
	};
};

export const Badge = Template.bind({});
Badge.args = {
	variant: 'default',
	size: 'small',
	clickable: false,
};

export const AllVariants: StoryFn = function renderAllVariants() {
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
};

export const AllSizes: StoryFn = function renderAllSizes() {
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
};

export const WithIcons: StoryFn = function renderWithIcons() {
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
};

export const Clickable: StoryFn = function renderClickable() {
	return {
		components: { N8nBadge },
		template: `
			<div style="display: flex; align-items: center; gap: var(--spacing--sm)">
				<N8nBadge clickable leading-icon="list-filter">Filter applied</N8nBadge>
				<N8nBadge clickable disabled leading-icon="lock">Locked</N8nBadge>
			</div>
		`,
	};
};
