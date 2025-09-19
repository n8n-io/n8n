import type { StoryObj } from '@storybook/vue3';
import { onMounted } from 'vue';

import { createChat } from '@n8n/chat/index';
import type { ChatOptions } from '@n8n/chat/types';

const webhookUrl = 'http://localhost:5678/webhook/ad712f8b-3546-4d08-b049-e0d035334a4c/chat';

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

// eslint-disable-next-line import-x/no-default-export
export default meta;
type Story = StoryObj<typeof meta>;

export const Fullscreen: Story = {
	args: {
		webhookUrl,
		mode: 'fullscreen',
		enableStreaming: false,
	} satisfies Partial<ChatOptions>,
};

export const Windowed: Story = {
	args: {
		webhookUrl,
		mode: 'window',
		enableStreaming: false,
	} satisfies Partial<ChatOptions>,
};

export const WorkflowChat: Story = {
	name: 'Workflow Chat',
	args: {
		webhookUrl: 'http://localhost:5678/webhook/ad324b56-3e40-4b27-874f-58d150504edc/chat',
		mode: 'fullscreen',
		allowedFilesMimeTypes: 'image/*,text/*,audio/*, application/pdf',
		allowFileUploads: true,
		showWelcomeScreen: false,
		initialMessages: [],
		enableStreaming: false,
	} satisfies Partial<ChatOptions>,
};
