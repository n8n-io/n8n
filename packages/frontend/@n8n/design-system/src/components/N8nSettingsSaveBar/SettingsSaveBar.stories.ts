import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ElNotification } from 'element-plus';
import { computed, ref } from 'vue';

import N8nSettingsSaveBar from './SettingsSaveBar.vue';
import N8nInput from '../N8nInput';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSettingsSection from '../N8nSettingsSection';
import N8nSwitch from '../N8nSwitch';

// Successful saves confirm through n8n's existing app-wide notification — the bottom-right
// Element Plus notification themed by the design system (the same one `useToast()` shows in the
// app) — rather than a bespoke toast, so settings confirmations look like every other
// confirmation in the product.
const notifySaved = (title: string) =>
	ElNotification({ title, type: 'success', position: 'bottom-right' });

const meta = {
	title: 'Instance Settings/Settings Save Bar',
	component: N8nSettingsSaveBar,
	argTypes: {
		visible: { control: 'boolean' },
		message: { control: 'text' },
		saveLabel: { control: 'text' },
		discardLabel: { control: 'text' },
		saving: { control: 'boolean' },
		saveDisabled: { control: 'boolean' },
		floating: { control: 'boolean' },
		saveShortcut: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'The explicit-save affordance for high-impact instance settings. It stays hidden until there are unsaved changes, then slides up showing an "Unsaved changes" status on the left plus Discard (outline) and Save (solid) actions on the right — the primary action sits on the far right, consistent with dialogs. It is presentational: the consumer owns `visible` (bind it to a dirty flag), `saving`, and reacts to `save`/`discard`. On a successful save, hide the bar and confirm through the existing app notification (`useToast().showMessage` in the app). The bar is a gently rounded (12px) bordered rectangle with a prominent shadow that spans the 720px settings content column plus 12px on each side (744px), so it sits a touch proud of the column — set `floating` to stick it 24px above the bottom of that column while scrolling. Mirrors Figma 5991:7910.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsSaveBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	args: {
		visible: true,
		message: 'Unsaved changes',
		saveLabel: 'Save settings',
		discardLabel: 'Discard changes',
		saving: false,
		saveDisabled: false,
		floating: false,
		saveShortcut: true,
	},
	render: (args) => ({
		components: { N8nSettingsSaveBar },
		setup() {
			return { args };
		},
		template: `
			<div style="max-width: 48rem;">
				<N8nSettingsSaveBar v-bind="args" @save="() => {}" @discard="() => {}" />
			</div>
		`,
	}),
};

export const Saving: Story = {
	...Playground,
	args: { ...Playground.args, saving: true },
	parameters: {
		docs: {
			description: { story: 'While a save is in flight the Save button shows its loading state.' },
		},
	},
};

export const Floating: Story = {
	render: () => ({
		components: {
			N8nSettingsSaveBar,
			N8nSettingsSection,
			N8nSettingsRowGroup,
			N8nSettingsRow,
			N8nInput,
		},
		setup() {
			const value = ref('');
			return { value };
		},
		template: `
			<div style="height: 22rem; overflow-y: auto; padding: var(--spacing--sm); background: var(--background--subtle); border-radius: var(--radius--md);">
				<div style="max-width: 45rem; margin-inline: auto; display: flex; flex-direction: column; gap: var(--spacing--lg);">
					<N8nSettingsSection title="Webhook" description="Scroll the panel — the save bar sticks to the bottom of the column.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow v-for="n in 6" :key="n" :title="'Setting ' + n" description="A high-impact instance setting that requires an explicit save." :action-fill="true">
								<template #action><N8nInput v-model="value" placeholder="Edit me" /></template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>
					<N8nSettingsSaveBar floating :visible="true" @save="() => {}" @discard="() => {}" />
				</div>
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'With `floating`, the bar is `position: sticky` at the bottom of its container, so it hovers over the settings column (not the full window width) while the content scrolls beneath it.',
			},
		},
	},
};

export const Interactive: Story = {
	render: () => ({
		components: {
			N8nSettingsSaveBar,
			N8nSettingsSection,
			N8nSettingsRowGroup,
			N8nSettingsRow,
			N8nInput,
		},
		setup() {
			const saved = ref('https://otel.observability.acme');
			const draft = ref(saved.value);
			const saving = ref(false);
			const dirty = computed(() => draft.value !== saved.value);

			const onSave = () => {
				saving.value = true;
				// Simulate a request; on success commit the draft, hide the bar, and confirm.
				setTimeout(() => {
					saved.value = draft.value;
					saving.value = false;
					notifySaved('Settings saved');
				}, 1000);
			};
			const onDiscard = () => {
				draft.value = saved.value;
			};

			return { draft, saving, dirty, onSave, onDiscard };
		},
		template: `
			<div style="max-width: 45rem; display: flex; flex-direction: column; gap: var(--spacing--lg);">
				<N8nSettingsSection title="Collector connection" description="Edit the endpoint to reveal the save bar. Discard reverts it; Save confirms with the app notification.">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="OTLP endpoint" description="Where to send OTLP traces." :action-fill="true">
							<template #action><N8nInput v-model="draft" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
				<N8nSettingsSaveBar
					:visible="dirty"
					:saving="saving"
					@save="onSave"
					@discard="onDiscard"
				/>
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					"The full explicit-save loop: editing the field flips a dirty flag that drives `visible`, so the bar slides up. Discard reverts the draft (hiding the bar); Save shows the loading state, then hides the bar and confirms through n8n's existing bottom-right notification. Cmd/Ctrl+S also saves while the bar is visible.",
			},
		},
	},
};

export const SettingsFlow: Story = {
	render: () => ({
		components: {
			N8nSettingsSaveBar,
			N8nSettingsSection,
			N8nSettingsRowGroup,
			N8nSettingsRow,
			N8nInput,
			N8nSwitch,
		},
		setup() {
			// Explicit-save (high-impact) fields.
			const saved = ref({ name: 'Acme Production', timezone: 'Europe/Warsaw' });
			const draft = ref({ ...saved.value });
			const saving = ref(false);
			const dirty = computed(
				() =>
					draft.value.name !== saved.value.name || draft.value.timezone !== saved.value.timezone,
			);

			// Instant-save (low-impact) toggle.
			const telemetry = ref(true);

			const onSave = () => {
				saving.value = true;
				setTimeout(() => {
					saved.value = { ...draft.value };
					saving.value = false;
					notifySaved('Settings saved');
				}, 1000);
			};
			const onDiscard = () => {
				draft.value = { ...saved.value };
			};
			const onToggleTelemetry = () => {
				// Low-impact: persists immediately and confirms with the same app notification.
				notifySaved('Settings saved');
			};

			return { draft, saving, dirty, telemetry, onSave, onDiscard, onToggleTelemetry };
		},
		template: `
			<div style="max-width: 45rem; display: flex; flex-direction: column; gap: var(--spacing--xl);">
				<N8nSettingsSection title="Instance" description="High-impact fields require an explicit save.">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Instance name" description="Shown in the header and in emails." :action-fill="true">
							<template #action><N8nInput v-model="draft.name" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Timezone" description="Used to schedule and display times." :action-fill="true">
							<template #action><N8nInput v-model="draft.timezone" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>

				<N8nSettingsSection title="Privacy" description="Low-impact toggles save instantly.">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Share anonymous telemetry" description="Help us improve n8n. Saved as soon as you toggle it.">
							<template #action>
								<N8nSwitch v-model="telemetry" @update:model-value="onToggleTelemetry" />
							</template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>

				<N8nSettingsSaveBar
					floating
					:visible="dirty"
					:saving="saving"
					@save="onSave"
					@discard="onDiscard"
				/>
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'A realistic settings page combining both save modes: the high-impact Instance fields drive the floating explicit-save bar, while the low-impact telemetry toggle saves instantly. Both confirm through the existing app notification.',
			},
		},
	},
};
