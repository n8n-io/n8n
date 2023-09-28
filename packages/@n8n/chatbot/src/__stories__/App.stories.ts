import type { StoryObj } from '@storybook/vue3';
import type { ChatbotOptions } from '@/types';
import { init } from '../main';
import { onMounted } from 'vue';

const webhookUrl = 'http://localhost:5678/webhook/513107b3-6f3a-4a1e-af21-659f0ed14183';

const meta = {
	title: 'Chatbot',
	render: (args: Partial<ChatbotOptions>) => ({
		setup() {
			onMounted(() => {
				init(args);
			});

			return {};
		},
		template: '<div id="n8n-chatbot" />',
	}),
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Fullscreen: Story = {
	args: {
		webhookUrl,
		mode: 'fullscreen',
	} satisfies Partial<ChatbotOptions>,
};

export const Windowed: Story = {
	args: {
		webhookUrl,
		mode: 'window',
	} satisfies Partial<ChatbotOptions>,
};
