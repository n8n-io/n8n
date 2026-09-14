import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PreviewTag from './PreviewTag.vue';

const meta = {
	title: 'Core/PreviewTag',
	component: PreviewTag,
	argTypes: {
		size: {
			control: 'select',
			options: ['small', 'medium'],
		},
	},
} satisfies Meta<typeof PreviewTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PreviewTag },
		setup() {
			return { args };
		},
		template: '<PreviewTag v-bind="args" />',
	}),
	args: {
		size: 'small',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { PreviewTag },
		template: `
			<div style="display: flex; gap: 12px; align-items: center;">
				<PreviewTag size="small" />
				<PreviewTag size="medium" />
			</div>
		`,
	}),
};
