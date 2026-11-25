import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nChatToken from './ChatToken.vue';

const meta = {
	title: 'Areas/Assistant/ChatToken',
	component: N8nChatToken,
	argTypes: {
		label: { control: 'text' },
		icon: { control: 'text' },
		selected: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'An inline reference to a resource inside chat text, such as an @-mention of a workflow or an agent.',
			},
		},
	},
} satisfies Meta<typeof N8nChatToken>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { label: 'Order sync', icon: 'workflow' },
};

export const InText: Story = {
	args: { label: 'Support bot', icon: 'robot' },
	render: (args) => ({
		components: { N8nChatToken },
		setup: () => ({ args }),
		template:
			'<p style="max-width: 320px">Ask <N8nChatToken v-bind="args" /> to reply to the open tickets of <N8nChatToken label="Order sync" icon="workflow" />.</p>',
	}),
};

export const Selected: Story = {
	args: { label: 'Order sync', icon: 'workflow', selected: true },
};

export const LongLabel: Story = {
	args: {
		label: 'Sync every order from the web shop into the warehouse sheet',
		icon: 'workflow',
	},
	render: (args) => ({
		components: { N8nChatToken },
		setup: () => ({ args }),
		template: '<div style="width: 200px"><N8nChatToken v-bind="args" /></div>',
	}),
};
