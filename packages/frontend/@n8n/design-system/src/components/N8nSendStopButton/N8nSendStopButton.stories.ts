import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nSendStopButton from './N8nSendStopButton.vue';

const meta = {
	title: 'Core/SendStopButton',
	component: N8nSendStopButton,
	argTypes: {
		streaming: { control: 'boolean' },
		disabled: { control: 'boolean' },
		size: {
			control: 'select',
			options: ['mini', 'small', 'medium', 'large'],
		},
		label: { control: 'text' },
		sendButtonTestId: { table: { disable: true } },
		stopButtonTestId: { table: { disable: true } },
	},
	parameters: {
		docs: {
			description: { component: 'A dual-state button that toggles between send and stop actions.' },
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof N8nSendStopButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nSendStopButton },
		setup() {
			return { args };
		},
		template: '<N8nSendStopButton v-bind="args" />',
	}),
	args: {
		streaming: false,
		disabled: false,
		size: 'medium',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { N8nSendStopButton },
		template: `
			<div style="display: flex; flex-direction: column; gap: 16px;">
				<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
					<N8nSendStopButton size="mini" />
					<N8nSendStopButton size="small" />
					<N8nSendStopButton size="medium" />
					<N8nSendStopButton size="large" />
				</div>
				<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
					<N8nSendStopButton size="mini" streaming />
					<N8nSendStopButton size="small" streaming />
					<N8nSendStopButton size="medium" streaming />
					<N8nSendStopButton size="large" streaming />
				</div>
			</div>
		`,
	}),
};

export const States: Story = {
	render: () => ({
		components: { N8nSendStopButton },
		template: `
			<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
				<N8nSendStopButton />
				<N8nSendStopButton disabled />
				<N8nSendStopButton streaming />
				<N8nSendStopButton label="Send" />
			</div>
		`,
	}),
};
