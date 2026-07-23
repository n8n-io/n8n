import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import type { Component } from 'vue';

import N8nSettingsLayout from './SettingsLayout.vue';
import N8nDataTableServer from '../N8nDataTableServer';
import N8nSettingsPageHeader from '../N8nSettingsPageHeader';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSettingsSection from '../N8nSettingsSection';
import N8nSwitch from '../N8nSwitch';
import N8nText from '../N8nText';

const meta = {
	title: 'Instance Settings/Settings Layout',
	component: N8nSettingsLayout,
	argTypes: {
		showBack: { control: 'boolean' },
		backLabel: { control: 'text' },
		fullWidth: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'Pads the settings page (24px sides/top, 48px bottom), centers the content and caps it at the content max-width (`--settings-content--max-width`, 45rem / 720px), and optionally renders the ghost back action pinned to the top-left. Set `fullWidth` to let wide content (e.g. a table) span the padded container; the page header always stays centered at 720px so its position is consistent across pages. The page-header → content gap is fixed at 48px (`--spacing--2xl`), enforced here via `.content > header + *` (owned by the following element so it never depends on margin-collapsing) and not configurable; other direct children fall back to a 24px (`--spacing--lg`) rhythm.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = `
	<N8nSettingsPageHeader
		title="Security & login"
		description="Your 2FA setup, passkeys, active sessions, and authorized OAuth applications."
		docs-url="https://docs.n8n.io/user-management/"
	/>
	<N8nSettingsSection title="Sign-in" description="How you sign in to n8n.">
		<N8nSettingsRowGroup>
			<N8nSettingsRow title="Telemetry" description="Share anonymous usage data.">
				<template #action><N8nSwitch v-model="enabled" /></template>
			</N8nSettingsRow>
			<N8nSettingsRow title="Beta features" description="Opt in to early features.">
				<template #action><N8nSwitch v-model="enabled" /></template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>
	</N8nSettingsSection>
`;

const renderPage: Story['render'] = (args) => ({
	components: {
		N8nSettingsLayout,
		N8nSettingsPageHeader,
		N8nSettingsSection,
		N8nSettingsRowGroup,
		N8nSettingsRow,
		N8nSwitch,
	},
	setup() {
		const enabled = ref(true);
		const onBack = () => alert('back');
		return { args, enabled, onBack };
	},
	template: `<N8nSettingsLayout v-bind="args" @back="onBack">${page}</N8nSettingsLayout>`,
});

export const Default: Story = {
	render: renderPage,
	args: {
		showBack: false,
	},
};

export const WithBackButton: Story = {
	render: renderPage,
	args: {
		showBack: true,
		backLabel: 'Back to app',
	},
};

export const NestedBackLabel: Story = {
	render: renderPage,
	args: {
		showBack: true,
		backLabel: 'Back to Security settings',
	},
	parameters: {
		docs: {
			description: {
				story:
					'On a nested sub-page, set `back-label` to express where back goes (e.g. "Back to Security settings"). The label is also the back button’s accessible name.',
			},
		},
	},
};

const tablePage = `
	<N8nSettingsPageHeader
		title="API keys"
		description="Use your API keys to control n8n programmatically."
		docs-url="https://docs.n8n.io/api/"
	/>
	<N8nSettingsSection>
		<N8nDataTableServer :headers="headers" :items="items" :items-length="items.length">
			<template #[slotApiKey]="{ value }">
				<N8nText size="small" color="text-base">{{ value }}</N8nText>
			</template>
		</N8nDataTableServer>
	</N8nSettingsSection>
`;

export const FullWidthTable: Story = {
	render: (args) => ({
		components: {
			N8nSettingsLayout,
			N8nSettingsPageHeader,
			N8nSettingsSection,
			N8nDataTableServer: N8nDataTableServer as unknown as Component,
			N8nText,
		},
		setup() {
			const headers = [
				{ title: 'Label', key: 'label' },
				{ title: 'API key', key: 'apiKey', disableSort: true },
				{ title: 'Created', key: 'created' },
				{ title: 'Last used', key: 'lastUsed' },
			];
			const items = [
				{
					id: '1',
					label: 'Production',
					apiKey: '••••••••••••3f9a',
					created: '7 months ago',
					lastUsed: '3 min ago',
				},
				{
					id: '2',
					label: 'CI / CD',
					apiKey: '••••••••••••a17c',
					created: '7 days ago',
					lastUsed: '14 min ago',
				},
				{
					id: '3',
					label: 'Staging',
					apiKey: '••••••••••••4b2e',
					created: '17 hours ago',
					lastUsed: 'Yesterday',
				},
				{
					id: '4',
					label: 'Local dev',
					apiKey: '••••••••••••9d05',
					created: '3 months ago',
					lastUsed: 'Last week',
				},
			];
			const slotApiKey = 'item.apiKey';
			return { args, headers, items, slotApiKey };
		},
		template: `<N8nSettingsLayout v-bind="args" show-back back-label="Back">${tablePage}</N8nSettingsLayout>`,
	}),
	args: {
		fullWidth: true,
	},
};
