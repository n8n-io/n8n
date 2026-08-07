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
