import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nSettingsRowGroup from './SettingsRowGroup.vue';
import N8nButton from '../N8nButton';
import N8nInput from '../N8nInput';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSwitch from '../N8nSwitch';

const meta = {
	title: 'Instance Settings/Settings Row Group',
	component: N8nSettingsRowGroup,
	parameters: {
		docs: {
			description: {
				component:
					'A bordered, rounded card that stacks settings rows. The last row hides its divider automatically; individual rows can opt out to merge into a sub-section.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsRowGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame = (inner: string) => `<div style="max-width: 45rem;">${inner}</div>`;

export const Default: Story = {
	render: () => ({
		components: { N8nSettingsRowGroup, N8nSettingsRow, N8nSwitch },
		setup() {
			const a = ref(true);
			const b = ref(false);
			const c = ref(true);
			return { a, b, c };
		},
		template: frame(`
			<N8nSettingsRowGroup>
				<N8nSettingsRow title="Telemetry" description="Share anonymous usage data.">
					<template #action><N8nSwitch v-model="a" /></template>
				</N8nSettingsRow>
				<N8nSettingsRow title="Beta features" description="Opt in to early features.">
					<template #action><N8nSwitch v-model="b" /></template>
				</N8nSettingsRow>
				<N8nSettingsRow title="Email notifications" description="Last row hides its divider automatically.">
					<template #action><N8nSwitch v-model="c" /></template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		`),
	}),
};

export const MixedLayouts: Story = {
	render: () => ({
		components: { N8nSettingsRowGroup, N8nSettingsRow, N8nSwitch, N8nButton, N8nInput },
		setup() {
			const enabled = ref(true);
			return { enabled };
		},
		template: frame(`
			<N8nSettingsRowGroup>
				<N8nSettingsRow title="Telemetry" description="Horizontal row with a switch.">
					<template #action><N8nSwitch v-model="enabled" /></template>
				</N8nSettingsRow>
				<N8nSettingsRow title="Webhook URL" description="Vertical row with a wide input." layout="vertical">
					<template #action><N8nInput placeholder="https://example.com/webhook" /></template>
				</N8nSettingsRow>
				<N8nSettingsRow title="Password" description="Horizontal row with a button.">
					<template #action><N8nButton variant="outline" size="small" label="Change password" /></template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		`),
	}),
};

export const MergedSubsection: Story = {
	render: () => ({
		components: { N8nSettingsRowGroup, N8nSettingsRow, N8nButton },
		template: frame(`
			<N8nSettingsRowGroup>
				<N8nSettingsRow title="2 other active sessions" :show-divider="false">
					<template #action><N8nButton variant="outline" size="small" label="Revoke all" /></template>
				</N8nSettingsRow>
				<N8nSettingsRow title="Safari on iPhone" description="Gdynia, Poland · last seen 4 hours ago" :show-divider="false">
					<template #action><N8nButton variant="outline" size="small" label="Revoke" /></template>
				</N8nSettingsRow>
				<N8nSettingsRow title="n8n CLI" description="headless · last seen 3 days ago" />
			</N8nSettingsRowGroup>
		`),
	}),
};

export const SingleRow: Story = {
	render: () => ({
		components: { N8nSettingsRowGroup, N8nSettingsRow, N8nButton },
		template: frame(`
			<N8nSettingsRowGroup>
				<N8nSettingsRow title="Plan" description="Enterprise">
					<template #action><N8nButton variant="outline" size="small" label="Manage plan" /></template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		`),
	}),
};
