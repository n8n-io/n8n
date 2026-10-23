import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nTimeAgo from './TimeAgo.vue';

const minutesFromNow = (minutes: number) =>
	new Date(Date.now() + minutes * 60 * 1000).toISOString();

const meta = {
	title: 'Core/TimeAgo',
	component: N8nTimeAgo,
	argTypes: {
		date: { control: 'text' },
		capitalize: { control: 'boolean' },
		locale: { control: 'text' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'Renders a date as a relative time, for example "3 minutes ago". The absolute date is available as the title attribute.',
			},
		},
	},
} satisfies Meta<typeof N8nTimeAgo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		date: minutesFromNow(-3),
	},
};

export const Capitalized: Story = {
	args: {
		date: minutesFromNow(-3),
		capitalize: true,
	},
};

export const FutureDate: Story = {
	args: {
		date: minutesFromNow(90),
	},
};
