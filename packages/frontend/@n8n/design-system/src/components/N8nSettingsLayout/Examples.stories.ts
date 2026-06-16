import type { Meta, StoryObj } from '@storybook/vue3-vite';
import type { Component } from 'vue';

import N8nSettingsLayout from './SettingsLayout.vue';
import N8nButton from '../N8nButton';
import N8nDataTableServer from '../N8nDataTableServer';
import N8nIcon from '../N8nIcon';
import N8nInput from '../N8nInput';
import N8nSettingsPageHeader from '../N8nSettingsPageHeader';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSettingsRowConfigure from '../N8nSettingsRowConfigure';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSettingsSection from '../N8nSettingsSection';
import N8nSwitch from '../N8nSwitch';
import N8nText from '../N8nText';

const meta = {
	title: 'Instance Settings/Examples',
	component: N8nSettingsLayout,
	parameters: {
		docs: {
			description: {
				component:
					'Composed examples mirroring the Figma examples frame: a Security & login page (leading visual slot + merged sub-section), a This instance page (metrics custom row + back action), and an API keys page (full-width table beneath a header that stays centered in the 720px column).',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const components = {
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsSection,
	N8nSettingsRowGroup,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSwitch,
	N8nButton,
	N8nInput,
	N8nIcon,
	N8nText,
	// Cast the generic data-table to a plain Component so its generic signature
	// doesn't leak into (and break) the Storybook render-function types.
	N8nDataTableServer: N8nDataTableServer as unknown as Component,
};

// Bordered, rounded metrics card mirroring the Settings Row `Custom` story: three equal columns
// (tiles) separated by vertical dividers, built from DS border/radius/spacing tokens. Each tile
// shows a metric title, a "Last 7 days" sublabel, the big bold value, and either a colored trend
// delta (success/danger) or the muted "/ unlimited" suffix. Iterates a `metrics` array from setup.
const metricTilesCard = `
	<div style="display: grid; grid-template-columns: repeat(3, 1fr); width: 100%; border: var(--border-width, 1px) solid var(--border-color--subtle); border-radius: var(--radius--xs); overflow: clip;">
		<div
			v-for="(metric, index) in metrics"
			:key="metric.title"
			:style="{
				display: 'flex',
				flexDirection: 'column',
				gap: 'var(--spacing--2xs)',
				padding: 'var(--spacing--sm)',
				borderInlineStart: index > 0 ? 'var(--border-width, 1px) solid var(--border-color--subtle)' : '',
			}"
		>
			<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs);">
				<N8nText size="small" color="text-base" tag="div">{{ metric.title }}</N8nText>
				<N8nText size="small" color="text-light" tag="div">Last 7 days</N8nText>
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
				<N8nText size="xlarge" bold color="text-dark" tag="span">{{ metric.value }}</N8nText>
				<N8nText v-if="metric.suffix" size="small" color="text-light" tag="span">{{ metric.suffix }}</N8nText>
				<span v-else style="display: inline-flex; align-items: center; gap: var(--spacing--5xs);">
					<N8nIcon icon="triangle" :color="metric.delta" size="xsmall" />
					<N8nText size="small" :color="metric.delta" tag="span">{{ metric.deltaText }}</N8nText>
				</span>
			</div>
		</div>
	</div>
`;

export const SecurityAndLogin: Story = {
	render: () => ({
		components,
		setup() {
			const onBack = () => alert('Back to app');
			const onConfigurePasskey = () => alert('Configure passkeys');
			const onLogOut = () => alert('Log out');
			const onRevoke = () => alert('Revoke');
			return { onBack, onConfigurePasskey, onLogOut, onRevoke };
		},
		template: `
			<N8nSettingsLayout show-back back-label="Back to app" @back="onBack">
				<N8nSettingsPageHeader
					title="Security & login"
					description="Your 2FA setup, passkeys, active sessions, and authorized OAuth applications."
					docs-url="https://docs.n8n.io/user-management/"
				/>

				<N8nSettingsSection title="Sign-in" description="How you sign in to n8n.">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Username" description="Used in audit trails and @-mentions. Set by your admin via SSO.">
							<template #action><N8nInput size="medium" placeholder="jan.ostrowka" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Password" description="Last changed 4 months ago.">
							<template #action><N8nButton variant="outline" size="medium" label="Change password" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Passkey" description="Sign in with your face, fingerprint, or device PIN." clickable @click="onConfigurePasskey">
							<template #action><N8nSettingsRowConfigure value="2 of 3 devices" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>

				<N8nSettingsSection title="Active sessions" description="Devices currently signed in to your account.">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Chrome 138 on macOS" description="Gdynia, Poland · active now" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="hard-drive" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Log out" @click="onLogOut" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="2 other active sessions">
							<template #action><N8nButton variant="outline" size="medium" label="Revoke all" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Safari on iPhone" description="Gdynia, Poland · last seen 4 hours ago" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="globe" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Revoke" @click="onRevoke" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="n8n CLI" description="headless · last seen 3 days ago" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="terminal" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Revoke" @click="onRevoke" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
			</N8nSettingsLayout>
		`,
	}),
};

export const PasskeysSubPage: Story = {
	render: () => ({
		components,
		setup() {
			// Nested sub-page: the back label names the parent page it returns to.
			const onBack = () => alert('Back to Security settings');
			const onAdd = () => alert('Add passkey');
			const onRemove = () => alert('Remove passkey');
			return { onBack, onAdd, onRemove };
		},
		template: `
			<N8nSettingsLayout show-back back-label="Back to Security settings" @back="onBack">
				<N8nSettingsPageHeader
					title="Passkeys"
					description="Manage the passkeys you use to sign in with your face, fingerprint, or device PIN."
					docs-url="https://docs.n8n.io/user-management/"
				/>

				<N8nSettingsSection>
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Add a passkey" description="Register this device or a hardware security key." hoverable>
							<template #action><N8nButton variant="outline" size="medium" label="Add passkey" @click="onAdd" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="MacBook Pro" description="Added 3 months ago · last used 3 min ago" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="hard-drive" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Remove" @click="onRemove" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="iPhone" description="Added 5 months ago · last used yesterday" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="fingerprint" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Remove" @click="onRemove" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="YubiKey 5C" description="Added 1 year ago · last used last week" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="key-round" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Remove" @click="onRemove" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
			</N8nSettingsLayout>
		`,
	}),
};

export const ThisInstance: Story = {
	render: () => ({
		components,
		setup() {
			const onBack = () => alert('Back');
			// `delta` drives the colored trend (success/danger); `suffix` is the muted
			// "/ unlimited" variant that has no trend arrow.
			const metrics = [
				{ title: 'Prod. executions', value: '23,432', delta: 'success', deltaText: '0.5pp' },
				{ title: 'Active workflows', value: '865', suffix: '/ unlimited' },
				{ title: 'Active users', value: '1.9%', delta: 'danger', deltaText: '0.5pp' },
			];
			return { onBack, metrics };
		},
		template: `
			<N8nSettingsLayout show-back @back="onBack">
				<N8nSettingsPageHeader
					title="This instance"
					description="Plan, usage, version, updates, instance details, resources, and support for this n8n instance."
					docs-url="https://docs.n8n.io"
				/>

				<N8nSettingsSection title="Plan and usage">
					<N8nSettingsRowGroup>
						<N8nSettingsRow layout="vertical" title="Usage">
							<template #action>${metricTilesCard}</template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Plan">
							<template #action><N8nText size="medium" color="text-dark">Enterprise</N8nText></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Billing">
							<template #action><N8nButton variant="outline" size="medium" label="Manage plan" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>

				<N8nSettingsSection title="Version and updates">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Current version">
							<template #action><N8nText size="medium" color="text-dark">2.9.4</N8nText></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Updates" description="2.10.2 available · 3 versions behind">
							<template #action>
								<div style="display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: var(--spacing--sm);">
									<a
										href="https://docs.n8n.io/release-notes"
										target="_blank"
										rel="noopener noreferrer"
										style="color: var(--text-color--subtle); font-size: var(--font-size--sm); line-height: var(--line-height--lg); text-decoration: none; cursor: pointer;"
									><span style="text-decoration: underline;">Release notes</span><span aria-hidden="true">↗</span></a>
									<N8nButton variant="outline" size="medium" label="Update" />
								</div>
							</template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
			</N8nSettingsLayout>
		`,
	}),
};

export const ApiKeys: Story = {
	render: () => ({
		components,
		setup() {
			const onBack = () => alert('Back');

			// Real n8n data-table headers: `key` maps to the item field; the trailing
			// `actions` column has no underlying data so it uses a value accessor.
			const headers = [
				{ title: 'Label', key: 'label' },
				{ title: 'API key', key: 'apiKey', disableSort: true },
				{ title: 'Created', key: 'created' },
				{ title: 'Last used', key: 'lastUsed' },
				{ title: '', key: 'actions', value: () => '', disableSort: true, align: 'end', width: 64 },
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

			// Dynamic slot names contain a dot, so they are bound via `#[expr]`.
			const slotApiKey = 'item.apiKey';
			const slotActions = 'item.actions';

			return { onBack, headers, items, slotApiKey, slotActions };
		},
		template: `
			<N8nSettingsLayout full-width show-back back-label="Back" @back="onBack">
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
						<template #[slotActions]>
							<div style="display: flex; justify-content: flex-end">
								<N8nButton variant="ghost" size="small" icon-only icon="ellipsis-vertical" aria-label="API key actions" />
							</div>
						</template>
					</N8nDataTableServer>
				</N8nSettingsSection>
			</N8nSettingsLayout>
		`,
	}),
};
