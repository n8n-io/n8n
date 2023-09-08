import type { Meta, StoryObj } from '@storybook/vue3';

import { init } from '../main';
import App from '../App.vue';
import { onMounted } from 'vue';

const meta = {
	/* 👇 The title prop is optional.
	 * See https://storybook.js.org/docs/vue/configure/overview#configure-story-loading
	 * to learn how to generate automatic titles
	 */
	title: 'App',
	component: App,
	render: (args: any) => ({
		setup() {
			onMounted(() => {
				init();
			});

			return { args };
		},
		template: '<div id="n8n-chatbot" />',
	}),
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
