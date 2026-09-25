import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nSetupConnection from './SetupConnection.vue';

const meta = {
	title: 'Areas/Assistant/SetupConnection',
	component: N8nSetupConnection,
	args: {
		connected: false,
		actionLabel: 'Connect',
		actions: [{ id: 'advanced', label: 'Advanced setup' }],
	},
} satisfies Meta<typeof N8nSetupConnection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Connect: Story = {};
export const Connecting: Story = { args: { loading: true } };
export const Connected: Story = {
	args: {
		connected: true,
		valueLabel: 'Account',
		value: 'demo@example.com',
		actions: [
			{ id: 'switch', label: 'Switch account' },
			{ id: 'edit', label: 'Edit credential' },
		],
	},
};
