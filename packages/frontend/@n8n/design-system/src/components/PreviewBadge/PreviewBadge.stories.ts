import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PreviewBadge from './PreviewBadge.vue';

const meta = {
	title: 'Core/PreviewBadge',
	component: PreviewBadge,
	argTypes: {
		size: {
			control: 'select',
			options: ['small', 'medium'],
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
		size: 'small',
	},
};

export const Sizes: Story = {
	render: function renderSizes() {
		return {
			components: { PreviewBadge },
			template: `
				<div style="display: flex; gap: var(--spacing--sm); align-items: center;">
					<PreviewBadge size="small" />
					<PreviewBadge size="medium" />
				</div>
			`,
		};
	},
};
