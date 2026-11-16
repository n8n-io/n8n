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

export const Preview: Story = {
	render: (args) => ({
		components: { N8nFeatureMaturityBadges },
		setup: () => ({ args }),
		template: row('<N8nFeatureMaturityBadges v-bind="args" />'),
	}),
};

export const Feature: Story = {
	render: (args) => ({
		components: { N8nFeatureMaturityBadges },
		setup: () => ({ args }),
		template: row('<N8nFeatureMaturityBadges v-bind="args" />'),
	}),
	args: {
		feature: 'agents',
	},
};

export const HidePreview: Story = {
	render: (args) => ({
		components: { N8nFeatureMaturityBadges },
		setup: () => ({ args }),
		template: row('<N8nFeatureMaturityBadges v-bind="args" />'),
	}),
	args: {
		feature: 'agents',
		hidePreview: true,
	},
};

export const HideEnterprise: Story = {
	render: (args) => ({
		components: { N8nFeatureMaturityBadges },
		setup: () => ({ args }),
		template: row('<N8nFeatureMaturityBadges v-bind="args" />'),
	}),
	args: {
		feature: 'agents',
		hideEnterprise: true,
	},
};
