import type { Meta, StoryObj } from '@storybook/vue3-vite';

import { BADGE_SIZE } from '../N8nBadge/Badge.type';
import NewBadge from './NewBadge.vue';

const meta = {
	title: 'Core/NewBadge',
	component: NewBadge,
	argTypes: {
		size: {
			control: 'select',
			options: BADGE_SIZE,
		},
	},
} satisfies Meta<typeof NewBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: function renderNewBadge(args) {
		return {
			components: { NewBadge },
			setup: function setup() {
				return { args };
			},
			template: '<NewBadge v-bind="args" />',
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
			components: { NewBadge },
			template: `
				<div style="display: flex; gap: var(--spacing--sm); align-items: center;">
					<NewBadge v-for="size in sizes" :key="size" :size="size" />
				</div>
			`,
		};
	},
};
