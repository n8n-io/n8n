import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nSettingsSection from './SettingsSection.vue';
import N8nButton from '../N8nButton';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSwitch from '../N8nSwitch';

const meta = {
	title: 'Instance Settings/Settings Section',
	component: N8nSettingsSection,
	parameters: {
		docs: {
			description: {
				component:
					'An optionally titled section that wraps one or more row groups. The vertical rhythm is fixed by design and driven by spacing tokens — there are no spacing props to override: the section header (title/description) sits 16px (`--spacing--sm`) above its body, separate row groups within the section are 12px (`--spacing--xs`) apart, and adjacent sibling sections are 32px (`--spacing--xl`) apart.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame = (inner: string) => `<div style="max-width: 45rem;">${inner}</div>`;

export const WithTitleAndDescription: Story = {
	render: (args) => ({
		components: { N8nSettingsSection, N8nSettingsRowGroup, N8nSettingsRow, N8nSwitch },
		setup() {
			const enabled = ref(true);
			return { args, enabled };
		},
		template: frame(`
			<N8nSettingsSection v-bind="args">
				<N8nSettingsRowGroup>
					<N8nSettingsRow title="Authenticator app" description="Six-digit codes from an app on your phone.">
						<template #action><N8nSwitch v-model="enabled" /></template>
					</N8nSettingsRow>
					<N8nSettingsRow title="Security key" description="A small physical key you plug in or tap.">
						<template #action><N8nSwitch v-model="enabled" /></template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>
		`),
	}),
	args: {
		title: 'Second factors',
		description: "Required by your admin. After your password, you'll be asked for one of these.",
	},
};

export const TitleOnly: Story = {
	render: (args) => ({
		components: { N8nSettingsSection, N8nSettingsRowGroup, N8nSettingsRow, N8nButton },
		setup: () => ({ args }),
		template: frame(`
			<N8nSettingsSection v-bind="args">
				<N8nSettingsRowGroup>
					<N8nSettingsRow title="Current version" description="2.9.4" />
				</N8nSettingsRowGroup>
			</N8nSettingsSection>
		`),
	}),
	args: {
		title: 'Version and updates',
	},
};

export const NoHeader: Story = {
	render: () => ({
		components: { N8nSettingsSection, N8nSettingsRowGroup, N8nSettingsRow, N8nButton },
		template: frame(`
			<N8nSettingsSection>
				<N8nSettingsRowGroup>
					<N8nSettingsRow title="Resources and support" description="Links to docs and support.">
						<template #action><N8nButton variant="outline" size="small" label="View" /></template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>
		`),
	}),
};

export const MultipleGroups: Story = {
	render: (args) => ({
		components: { N8nSettingsSection, N8nSettingsRowGroup, N8nSettingsRow, N8nButton },
		setup: () => ({ args }),
		template: frame(`
			<N8nSettingsSection v-bind="args">
				<N8nSettingsRowGroup>
					<N8nSettingsRow title="Current version" description="2.9.4" />
				</N8nSettingsRowGroup>
				<N8nSettingsRowGroup>
					<N8nSettingsRow title="Updates" description="2.10.2 available · 3 versions behind">
						<template #action><N8nButton variant="outline" size="small" label="Update" /></template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>
		`),
	}),
	args: {
		title: 'Version and updates',
	},
};
