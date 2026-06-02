import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nSettingsRow from './SettingsRow.vue';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nInput from '../N8nInput';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSwitch from '../N8nSwitch';
import N8nText from '../N8nText';

const meta = {
	title: 'Instance Settings/Settings Row',
	component: N8nSettingsRow,
	argTypes: {
		layout: { control: 'select', options: ['horizontal', 'vertical', 'custom'] },
		align: { control: 'select', options: ['center', 'start'] },
		maxDescriptionLines: { control: { type: 'number', min: 1, max: 3 } },
		truncateTitle: { control: 'boolean' },
		showDivider: { control: 'boolean' },
		showVisual: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'The core description-list row: left info (title/description + optional leading visual) and an action slot, arranged horizontally, vertically, or as a fully custom full-width slot.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const card = (inner: string) =>
	`<div style="max-width: 45rem;"><N8nSettingsRowGroup>${inner}</N8nSettingsRowGroup></div>`;

export const Default: Story = {
	render: (args) => ({
		components: { N8nSettingsRow, N8nSettingsRowGroup, N8nSwitch },
		setup() {
			const enabled = ref(true);
			return { args, enabled };
		},
		template: card(`
			<N8nSettingsRow v-bind="args">
				<template #action><N8nSwitch v-model="enabled" /></template>
			</N8nSettingsRow>
		`),
	}),
	args: {
		title: 'Enable telemetry',
		description: 'Share anonymous usage data to help us improve n8n.',
	},
};

export const Horizontal: Story = {
	render: (args) => ({
		components: { N8nSettingsRow, N8nSettingsRowGroup, N8nButton },
		setup: () => ({ args }),
		template: card(`
			<N8nSettingsRow v-bind="args">
				<template #action><N8nButton variant="outline" size="small" label="Change password" /></template>
			</N8nSettingsRow>
		`),
	}),
	args: {
		title: 'Password',
		description: 'Last changed 4 months ago.',
		layout: 'horizontal',
	},
};

export const Vertical: Story = {
	render: (args) => ({
		components: { N8nSettingsRow, N8nSettingsRowGroup, N8nInput },
		setup: () => ({ args }),
		template: card(`
			<N8nSettingsRow v-bind="args">
				<template #action><N8nInput placeholder="https://example.com/webhook" /></template>
			</N8nSettingsRow>
		`),
	}),
	args: {
		title: 'Webhook URL',
		description: 'The full action below gets the entire row width.',
		layout: 'vertical',
	},
};

export const Custom: Story = {
	render: (args) => ({
		components: { N8nSettingsRow, N8nSettingsRowGroup, N8nText },
		setup: () => ({ args }),
		template: card(`
			<N8nSettingsRow v-bind="args">
				<N8nText size="small" color="text-base">Usage</N8nText>
				<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding-top: 8px;">
					<div>
						<N8nText size="small" color="text-light" tag="div">Prod. executions</N8nText>
						<N8nText size="large" bold color="text-dark" tag="div">23,432</N8nText>
					</div>
					<div>
						<N8nText size="small" color="text-light" tag="div">Active workflows</N8nText>
						<N8nText size="large" bold color="text-dark" tag="div">865</N8nText>
					</div>
					<div>
						<N8nText size="small" color="text-light" tag="div">Active users</N8nText>
						<N8nText size="large" bold color="text-dark" tag="div">1.9%</N8nText>
					</div>
				</div>
			</N8nSettingsRow>
		`),
	}),
	args: {
		layout: 'custom',
	},
};

export const WithVisual: Story = {
	render: (args) => ({
		components: { N8nSettingsRow, N8nSettingsRowGroup, N8nButton, N8nIcon },
		setup: () => ({ args }),
		template: card(`
			<N8nSettingsRow v-bind="args">
				<template #visual><N8nIcon icon="globe" /></template>
				<template #action><N8nButton variant="outline" size="small" label="Log out" /></template>
			</N8nSettingsRow>
		`),
	}),
	args: {
		title: 'Chrome 138 on macOS',
		description: 'Gdynia, Poland · active now',
		showVisual: true,
	},
};

export const WithoutDescription: Story = {
	render: (args) => ({
		components: { N8nSettingsRow, N8nSettingsRowGroup, N8nSwitch },
		setup() {
			const enabled = ref(false);
			return { args, enabled };
		},
		template: card(`
			<N8nSettingsRow v-bind="args">
				<template #action><N8nSwitch v-model="enabled" /></template>
			</N8nSettingsRow>
		`),
	}),
	args: {
		title: 'Compact mode',
	},
};

export const DescriptionTruncation: Story = {
	render: (args) => ({
		components: { N8nSettingsRow, N8nSettingsRowGroup, N8nSwitch },
		setup() {
			const enabled = ref(true);
			const long =
				'Row description, row description, row description, row description, row description, row description, row description, row description, row description, row description.';
			return { args, enabled, long };
		},
		template: card(`
			<N8nSettingsRow v-bind="args" :description="long" :max-description-lines="2">
				<template #action><N8nSwitch v-model="enabled" /></template>
			</N8nSettingsRow>
			<N8nSettingsRow v-bind="args" :description="long" :max-description-lines="3">
				<template #action><N8nSwitch v-model="enabled" /></template>
			</N8nSettingsRow>
		`),
	}),
	args: {
		title: 'Truncates beyond the clamp',
	},
};

export const ActionMaxWidth: Story = {
	render: (args) => ({
		components: { N8nSettingsRow, N8nSettingsRowGroup, N8nInput },
		setup: () => ({ args }),
		template: card(`
			<N8nSettingsRow v-bind="args" action-max-width="50%">
				<template #action><N8nInput placeholder="Capped at 50%" /></template>
			</N8nSettingsRow>
			<N8nSettingsRow v-bind="args" :action-max-width="false">
				<template #action><N8nInput placeholder="No cap" /></template>
			</N8nSettingsRow>
		`),
	}),
	args: {
		title: 'API key',
		description: 'The action can be capped or allowed to grow.',
	},
};

export const Alignment: Story = {
	render: (args) => ({
		components: { N8nSettingsRow, N8nSettingsRowGroup, N8nButton },
		setup: () => ({ args }),
		template: card(`
			<N8nSettingsRow v-bind="args" align="center">
				<template #action><N8nButton variant="outline" size="small" label="Center" /></template>
			</N8nSettingsRow>
			<N8nSettingsRow v-bind="args" align="start">
				<template #action><N8nButton variant="outline" size="small" label="Start" /></template>
			</N8nSettingsRow>
		`),
	}),
	args: {
		title: 'Alignment',
		description:
			'Use start alignment when the info block is intrinsically tall, so the action stays pinned to the top.',
	},
};

export const NoDivider: Story = {
	render: (args) => ({
		components: { N8nSettingsRow, N8nSettingsRowGroup, N8nButton },
		setup: () => ({ args }),
		template: card(`
			<N8nSettingsRow title="2 other active sessions" :show-divider="false">
				<template #action><N8nButton variant="outline" size="small" label="Revoke all" /></template>
			</N8nSettingsRow>
			<N8nSettingsRow v-bind="args">
				<template #action><N8nButton variant="outline" size="small" label="Revoke" /></template>
			</N8nSettingsRow>
		`),
	}),
	args: {
		title: 'Safari on iPhone',
		description: 'Gdynia, Poland · last seen 4 hours ago',
	},
};

export const Expandable: Story = {
	render: (args) => ({
		components: { N8nSettingsRow, N8nSettingsRowGroup, N8nButton, N8nText },
		setup() {
			const expanded = ref(false);
			return { args, expanded };
		},
		template: card(`
			<N8nSettingsRow v-bind="args" expandable :expanded="expanded">
				<template #action>
					<N8nButton variant="ghost" size="small" :label="expanded ? 'Hide' : 'Configure'" @click="expanded = !expanded" />
				</template>
				<template #revealed>
					<N8nText size="small" color="text-base">PR2 reveals this content when expanded.</N8nText>
				</template>
			</N8nSettingsRow>
		`),
	}),
	args: {
		title: 'Authenticator app',
		description:
			'Disclosure pattern reserved for PR2 (control owns the toggle via v-model:expanded).',
	},
};
