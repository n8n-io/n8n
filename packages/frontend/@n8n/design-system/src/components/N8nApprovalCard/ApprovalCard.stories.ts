import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nApprovalCard from './ApprovalCard.vue';

const meta = {
	title: 'Areas/Assistant/ApprovalCard',
	component: N8nApprovalCard,
	args: {
		title: 'Approval required',
		description: 'The agent wants to run the Calculator tool.',
		supportsSessionApproval: true,
	},
} satisfies Meta<typeof N8nApprovalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Inline: Story = {
	args: {
		variant: 'inline',
		autoFocus: false,
		args: { query: 'Example tool input' },
	},
};

export const KeyboardNavigation: Story = {
	args: {
		description:
			'Use Arrow Up and Arrow Down to highlight a choice. Use Enter or Space to select it.',
	},
	play({ canvasElement }) {
		const listbox = canvasElement.querySelector('[role="listbox"]');
		if (listbox instanceof HTMLElement) listbox.focus({ preventScroll: true });
	},
};

export const Disabled: Story = {
	args: { disabled: true },
};

export const Destructive: Story = {
	args: {
		title: 'Delete workflow?',
		description: 'This will permanently delete the workflow and its execution history.',
		supportsSessionApproval: false,
		destructive: true,
	},
};

export const Resolved: Story = {
	args: { disabled: true, decision: 'allowed' },
};
