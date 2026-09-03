import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nBadge from './Badge.vue';

const meta = {
	title: 'Core/Badge',
	component: N8nBadge,
	argTypes: {
		theme: {
			control: 'select',
			options: ['default', 'success', 'warning', 'danger', 'primary', 'secondary', 'tertiary'],
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'mini', 'medium', 'large', 'xlarge'],
		},
		bold: { control: 'boolean' },
		showBorder: { control: 'boolean' },
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
	render: (args) => ({
		components: { N8nBadge },
		setup() {
			return { args };
		},
		template: '<N8nBadge v-bind="args">{{ args.default }}</N8nBadge>',
	}),
	args: {
		theme: 'default',
		size: 'small',
		bold: false,
		showBorder: true,
		default: 'Badge',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { N8nBadge },
		template: `
			<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
				<N8nBadge size="xsmall">XSmall</N8nBadge>
				<N8nBadge size="small">Small</N8nBadge>
				<N8nBadge size="mini">Mini</N8nBadge>
				<N8nBadge size="medium">Medium</N8nBadge>
				<N8nBadge size="large">Large</N8nBadge>
				<N8nBadge size="xlarge">XLarge</N8nBadge>
			</div>
		`,
	}),
};

export const Variants: Story = {
	render: () => ({
		components: { N8nBadge },
		template: `
			<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
				<N8nBadge theme="default">Default</N8nBadge>
				<N8nBadge theme="success">Success</N8nBadge>
				<N8nBadge theme="warning">Warning</N8nBadge>
				<N8nBadge theme="danger">Danger</N8nBadge>
				<N8nBadge theme="primary">Primary</N8nBadge>
				<N8nBadge theme="secondary">Secondary</N8nBadge>
				<N8nBadge theme="tertiary">Tertiary</N8nBadge>
			</div>
		`,
	}),
};
