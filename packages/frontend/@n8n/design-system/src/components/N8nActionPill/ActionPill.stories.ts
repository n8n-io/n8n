import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nActionPill from './ActionPill.vue';

const meta = {
	title: 'Core/Action Pill',
	component: N8nActionPill,
	argTypes: {
		type: {
			control: 'select',
			options: ['default', 'info', 'danger'],
		},
		size: {
			control: 'select',
			options: ['small', 'medium'],
		},
	},
	args: {
		text: 'Free credits',
	},
} satisfies Meta<typeof N8nActionPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Info: Story = {
	args: {
		text: 'Gateway credits',
		type: 'info',
	},
};

export const Danger: Story = {
	args: {
		text: 'No credits',
		type: 'danger',
	},
};
