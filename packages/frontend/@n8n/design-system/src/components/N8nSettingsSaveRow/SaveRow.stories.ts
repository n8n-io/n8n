import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nSettingsSaveRow from './SaveRow.vue';
import N8nInput from '../N8nInput';
import N8nSettingsLayout from '../N8nSettingsLayout';
import N8nSettingsPageHeader from '../N8nSettingsPageHeader';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSettingsSection from '../N8nSettingsSection';

const meta = {
	title: 'Instance Settings/Settings Save Row',
	component: N8nSettingsSaveRow,
	argTypes: {
		saving: { control: 'boolean' },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'A plain Save + Discard buttons row. Save is the primary action, Discard is secondary. It is purely presentational: it renders two buttons and emits `save` and `discard`. The consumer owns when the row is enabled (e.g. when there are unsaved changes) and when `saving` is true. Place it statically at the bottom of a section or at the bottom of a page.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsSaveRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	args: {
		saveLabel: 'Save settings',
		discardLabel: 'Discard changes',
		saving: false,
		disabled: false,
	},
};

export const Saving: Story = {
	args: { saving: true },
	parameters: {
		docs: {
			description: { story: 'While a save is in flight the Save button shows its loading state.' },
		},
	},
};

export const Disabled: Story = {
	args: { disabled: true },
	parameters: {
		docs: {
			description: {
				story:
					'When there is nothing to save the consumer disables the row. Both buttons are disabled.',
			},
		},
	},
};

export const SectionSave: Story = {
	render: () => ({
		components: {
			N8nSettingsSection,
			N8nSettingsRowGroup,
			N8nSettingsRow,
			N8nSettingsSaveRow,
			N8nInput,
		},
		setup() {
			const endpoint = ref('https://otel.observability.acme');
			const service = ref('n8n-production');
			const saving = ref(false);
			const onSave = () => {
				saving.value = true;
				setTimeout(() => (saving.value = false), 1200);
			};
			return { endpoint, service, saving, onSave };
		},
		template: `
			<div style="max-width: 45rem;">
				<N8nSettingsSection title="Collector connection" description="Where to send OTLP traces.">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="OTLP endpoint" description="Shared in support tickets so logs can be traced." :action-fill="true">
							<template #action><N8nInput v-model="endpoint" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Service name" description="How this instance appears in your collector." :action-fill="true">
							<template #action><N8nInput v-model="service" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
					<N8nSettingsSaveRow :saving="saving" @save="onSave" @discard="() => {}" />
				</N8nSettingsSection>
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'Section-level save: the buttons row sits at the bottom of a settings section (Figma 69:879).',
			},
		},
	},
};

export const PageSave: Story = {
	render: () => ({
		components: {
			N8nSettingsLayout,
			N8nSettingsPageHeader,
			N8nSettingsSection,
			N8nSettingsRowGroup,
			N8nSettingsRow,
			N8nSettingsSaveRow,
			N8nInput,
		},
		setup() {
			const name = ref('Acme Production');
			const timezone = ref('Europe/Warsaw');
			const saving = ref(false);
			const onSave = () => {
				saving.value = true;
				setTimeout(() => (saving.value = false), 1200);
			};
			return { name, timezone, saving, onSave };
		},
		template: `
			<N8nSettingsLayout show-back back-label="Back">
				<N8nSettingsPageHeader title="General" description="Instance-wide settings." />
				<N8nSettingsSection title="Instance">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Instance name" description="Shown in the header and in emails." :action-fill="true">
							<template #action><N8nInput v-model="name" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Timezone" description="Used to schedule and display times." :action-fill="true">
							<template #action><N8nInput v-model="timezone" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
				<N8nSettingsSaveRow :saving="saving" @save="onSave" @discard="() => {}" />
			</N8nSettingsLayout>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'Page-level save: the buttons row sits at the very bottom of the page (Figma 95:4253).',
			},
		},
	},
};
