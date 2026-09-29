import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nApprovalCard from './ApprovalCard.vue';

const meta = {
	title: 'Areas/Assistant/ApprovalCard',
	component: N8nApprovalCard,
	args: {
		title: 'Approval required',
		description: 'The agent wants to run the Calculator tool.',
		options: [
			{ key: 'session', icon: 'check-check', label: 'Allow for this session' },
			{ key: 'once', icon: 'check', label: 'Approve' },
			{ key: 'reject', icon: 'ban', label: 'Reject' },
		],
	},
} satisfies Meta<typeof N8nApprovalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
	args: { disabled: true },
};

export const Destructive: Story = {
	args: {
		title: 'Delete workflow?',
		description: 'This will permanently delete the workflow and its execution history.',
		options: [
			{ key: 'once', icon: 'check', label: 'Delete workflow', destructive: true },
			{ key: 'reject', icon: 'ban', label: 'Cancel' },
		],
	},
};

export const Resolved: Story = {
	args: { disabled: true },
	render: (args) => ({
		components: { N8nApprovalCard },
		setup: () => ({ args }),
		template:
			'<N8nApprovalCard v-bind="args"><template #footer>Approved</template></N8nApprovalCard>',
	}),
};
