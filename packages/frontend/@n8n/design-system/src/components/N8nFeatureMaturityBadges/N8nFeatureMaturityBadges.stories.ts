import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nFeatureMaturityBadges from './N8nFeatureMaturityBadges.vue';

const meta = {
	title: 'Core/FeatureMaturityBadges',
	component: N8nFeatureMaturityBadges,
	argTypes: {
		hidePreview: { control: 'boolean' },
		hideEnterprise: { control: 'boolean' },
	},
} satisfies Meta<typeof N8nFeatureMaturityBadges>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = (inner: string) =>
	`<div style="display: flex; gap: var(--spacing--2xs); align-items: center;">${inner}</div>`;

function renderBadges(args: Story['args']) {
	return {
		components: { N8nFeatureMaturityBadges },
		setup: () => ({ args }),
		template: row('<N8nFeatureMaturityBadges v-bind="args" />'),
	};
}

export const WithPreviewAndEnterprise: Story = {
	name: 'With Preview and Enterprise',
	render: renderBadges,
	args: {
		feature: 'agents',
	},
};

export const WithPreviewOnly: Story = {
	name: 'With Preview only',
	render: renderBadges,
	args: {
		feature: 'workflowReviews',
	},
};

export const WithEnterpriseOnly: Story = {
	name: 'With Enterprise only',
	render: renderBadges,
	args: {
		feature: 'assistant',
	},
};
