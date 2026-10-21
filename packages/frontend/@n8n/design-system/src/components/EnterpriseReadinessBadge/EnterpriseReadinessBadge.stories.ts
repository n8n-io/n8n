import type { Meta, StoryObj } from '@storybook/vue3-vite';

import EnterpriseReadinessBadge from './EnterpriseReadinessBadge.vue';
import { BADGE_SIZE } from '../N8nBadge/Badge.type';
import PreviewBadge from '../PreviewBadge/PreviewBadge.vue';

const meta = {
	title: 'Core/EnterpriseReadinessBadge',
	component: EnterpriseReadinessBadge,
	argTypes: {
		size: {
			control: 'select',
			options: BADGE_SIZE,
		},
	},
} satisfies Meta<typeof EnterpriseReadinessBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: function renderEnterpriseReadinessBadge(args) {
		return {
			components: { EnterpriseReadinessBadge },
			setup: function setup() {
				return { args };
			},
			template: '<EnterpriseReadinessBadge v-bind="args" />',
		};
	},
	args: {
		size: 'xxsmall',
	},
};

export const Sizes: Story = {
	render: function renderSizes() {
		return {
			components: { EnterpriseReadinessBadge },
			template: `
				<div style="display: flex; gap: var(--spacing--sm); align-items: center;">
					<EnterpriseReadinessBadge size="xxsmall" />
					<EnterpriseReadinessBadge size="xsmall" />
				</div>
			`,
		};
	},
};

export const WithPreviewBadge: Story = {
	render: function renderWithPreviewBadge() {
		return {
			components: { EnterpriseReadinessBadge, PreviewBadge },
			template: `
				<div style="display: flex; gap: var(--spacing--2xs); align-items: center;">
					<PreviewBadge />
					<EnterpriseReadinessBadge />
				</div>
			`,
		};
	},
};
