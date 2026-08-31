import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nCallout from './Callout.vue';
import N8nLink from '../N8nLink';
import N8nText from '../N8nText';

const meta = {
	title: 'Core/Callout',
	component: N8nCallout,
	argTypes: {
		theme: {
			control: 'select',
			options: ['info', 'secondary', 'success', 'warning', 'danger', 'custom'],
		},
		icon: { control: 'text' },
		default: { control: 'text' },
	},
	parameters: {
		docs: {
			description: {
				component: 'A highlighted information panel for announcements, tips, or warnings.',
			},
		},
		design: {
			type: 'figma',
			url: 'https://www.figma.com/file/tPpJvbrnHbP8C496cYuwyW/Node-pinning?node-id=15%3A5777',
		},
	},
} satisfies Meta<typeof N8nCallout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nCallout },
		setup() {
			return { args };
		},
		template: `
			<N8nCallout v-bind="args">
				{{ args.default }}
			</N8nCallout>
		`,
	}),
	args: {
		theme: 'success',
		default: 'This is a default callout.',
	},
};

export const Variants: Story = {
	args: {
		theme: 'info',
	},
	render: () => ({
		components: { N8nCallout },
		template: `
			<div style="display: flex; flex-direction: column; gap: 12px;">
				<N8nCallout theme="info">This is an info callout.</N8nCallout>
				<N8nCallout theme="secondary">This is a secondary callout.</N8nCallout>
				<N8nCallout theme="success">This is a success callout.</N8nCallout>
				<N8nCallout theme="warning">This is a warning callout.</N8nCallout>
				<N8nCallout theme="danger">This is a danger callout.</N8nCallout>
				<N8nCallout theme="custom" icon="git-branch">This is a custom callout.</N8nCallout>
			</div>
		`,
	}),
};

export const Custom: Story = {
	render: (args) => ({
		components: { N8nCallout, N8nLink },
		setup() {
			return { args };
		},
		template: `
			<N8nCallout v-bind="args">
				{{ args.default }}
				<template #actions>
					<N8nLink size="small">Do something!</N8nLink>
				</template>
			</N8nCallout>
		`,
	}),
	args: {
		theme: 'custom',
		icon: 'git-branch',
		default: 'This is a custom callout.',
	},
};

export const Secondary: Story = {
	render: (args) => ({
		components: { N8nCallout, N8nLink, N8nText },
		setup() {
			return { args };
		},
		template: `
			<N8nCallout v-bind="args">
				{{ args.default }}
				<template #actions>
					<N8nLink theme="secondary" size="small" :bold="true" :underline="true">
						Unpin
					</N8nLink>
				</template>
				<template #trailingContent>
					<N8nLink
						theme="secondary"
						size="small"
						:bold="true"
						:underline="true"
						to="https://n8n.io"
					>
						Learn more
					</N8nLink>
				</template>
			</N8nCallout>
		`,
	}),
	args: {
		theme: 'secondary',
		icon: 'pin',
		default: 'This data is pinned.',
	},
};
