import type { Meta, StoryObj } from '@storybook/vue3-vite';

import ScrollFadeComparison from './ScrollFadeComparison.vue';

const meta = {
	title: 'Experimental/ScrollFadeComparison',
	component: ScrollFadeComparison,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Temporary page for a scroll-fade recording. Delete this story after the recording.',
			},
		},
	},
} satisfies Meta<typeof ScrollFadeComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Comparison: Story = {};
