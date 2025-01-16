/* eslint-disable @typescript-eslint/naming-convention */
import type { StoryObj } from '@storybook/vue3';
import { onMounted } from 'vue';

import { createChat } from '@n8n/chat/index';
import type { ChatOptions } from '@n8n/chat/types';

const webhookUrl = 'http://localhost:5678/webhook/40a1e365-17e7-43db-aa4d-ec5a4194c15f/chat';

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

export const WorkflowChat: Story = {
	name: 'Workflow Chat',
	args: {
		webhookUrl: 'http://localhost:5678/webhook/40a1e365-17e7-43db-aa4d-ec5a4194c15f/chat',
		mode: 'fullscreen',
		allowedFilesMimeTypes: 'image/*,text/*,audio/*, application/pdf',
		allowFileUploads: true,
		showWelcomeScreen: false,
		initialMessages: [],
	} satisfies Partial<ChatOptions>,
};
