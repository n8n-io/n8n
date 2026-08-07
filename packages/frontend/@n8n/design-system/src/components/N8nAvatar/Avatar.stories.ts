import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nAvatar from './Avatar.vue';

const meta = {
	title: 'Core/Avatar',
	component: N8nAvatar,
	argTypes: {
		size: {
			control: 'select',
			options: ['xxsmall', 'xsmall', 'small', 'medium', 'large'],
		},
		firstName: { control: 'text' },
		lastName: { control: 'text' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'A user avatar component that renders profile images or initials in fixed sizes.',
			},
		},
	},
} satisfies Meta<typeof N8nAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nAvatar },
		setup() {
			return { args };
		},
		template: '<N8nAvatar v-bind="args" />',
	}),
	args: {
		firstName: 'Sunny',
		lastName: 'Side',
		size: 'medium',
	},
};
