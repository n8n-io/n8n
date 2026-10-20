import type { Meta, StoryObj } from '@storybook/vue3-vite';

import { BADGE_SIZE } from '../N8nBadge/Badge.type';
import PreviewBadge from './PreviewBadge.vue';

const meta = {
	title: 'Core/PreviewBadge',
	component: PreviewBadge,
	argTypes: {
		size: {
			control: 'select',
			options: BADGE_SIZE,
		},
	},
} satisfies Meta<typeof PreviewBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: function renderPreviewBadge(args) {
		return {
			components: { PreviewBadge },
			setup: function setup() {
				return { args };
			},
			template: '<PreviewBadge v-bind="args" />',
		};
	},
	args: {
		size: 'xxsmall',
	},
};

export const Sizes: Story = {
	render: function renderSizes() {
		return {
			setup: function setup() {
				return { sizes: BADGE_SIZE };
			},
			components: { PreviewBadge },
			template: `
				<div style="display: flex; gap: var(--spacing--sm); align-items: center;">
					<PreviewBadge v-for="size in sizes" :key="size" :size="size" />
				</div>
			`,
		};
	},
};
