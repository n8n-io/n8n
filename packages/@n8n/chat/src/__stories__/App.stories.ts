/* eslint-disable @typescript-eslint/naming-convention */
import type { StoryObj } from '@storybook/vue3';
import { onMounted } from 'vue';
import type { ChatOptions } from '@/types';
import { createChat } from '@/index';

const webhookUrl = 'http://localhost:5678/webhook/513107b3-6f3a-4a1e-af21-659f0ed14183';

const meta = {
	title: 'Chat',
	render: (args: Partial<ChatOptions>) => ({
		setup() {
			onMounted(() => {
				createChat(args);
			});

			return {};
		},
		template: '<div id="n8n-chat" />',
	}),
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
};

// eslint-disable-next-line import/no-default-export
export default meta;
type Story = StoryObj<typeof meta>;

export const Fullscreen: Story = {
	args: {
		webhookUrl,
		mode: 'fullscreen',
	} satisfies Partial<ChatOptions>,
};

export const Windowed: Story = {
	args: {
		webhookUrl,
		mode: 'window',
	} satisfies Partial<ChatOptions>,
};
