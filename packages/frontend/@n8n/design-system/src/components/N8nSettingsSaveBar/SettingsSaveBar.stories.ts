import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, onMounted, ref } from 'vue';

import { confirmSaved } from './quickSaveNotification';
import N8nSettingsSaveBar from './SettingsSaveBar.vue';
import N8nInput from '../N8nInput';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSettingsSection from '../N8nSettingsSection';
import N8nSwitch from '../N8nSwitch';

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
					'The explicit-save affordance for high-impact instance settings. It stays hidden until there are unsaved changes, then slides up showing an "Unsaved changes" status on the left plus Discard (outline) and Save (solid) actions on the right — the primary action sits on the far right, consistent with dialogs. The bar is always one line tall: the status message never wraps, it truncates with an ellipsis. Keep the default "Unsaved changes" copy unless the page has a strong reason to differ. It is presentational: the consumer owns `visible` (bind it to a dirty flag), `saving`, and reacts to `save`/`discard`. On a successful save, hide the bar and confirm through the existing app notification (`useToast().showMessage` in the app). The bar is a gently rounded (12px) bordered rectangle with a prominent shadow that spans its container — the settings content column — plus its own 12px side padding (720px column → 744px bar), so it sits a touch proud of the column while its inner edges align exactly with the settings rows: the status message starts on the rows\' left edge and the Save button ends on their right edge. Render it as the last child of the settings content column (with the page\'s bottom padding on the content inside the scroll container, as `N8nSettingsLayout` does — not on the scroll container itself); set `floating` to make it float 24px above the bottom of the scrollport while there is more content below the fold — at the end of the page (or on pages shorter than the scrollport) it settles into flow after the last settings row, spaced by the column\'s own gap. While resting in flow it is not overlaying anything, so it sheds the overlay chrome (surface, border, shadow) and tucks its content in to align with the settings rows\' inner content line (row side padding), reading as part of the page like a closing settings row; the chrome fades back in (200ms, DS ease-out) and the content springs back out the moment it detaches on scroll. Plain `position: sticky` plus an internal stuck-state observer, no host wiring needed. Mirrors Figma 5991:7910.',
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
			<div style="max-width: 48rem; padding: var(--spacing--lg);">
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
			<div style="height: 22rem; overflow-y: auto; padding: var(--spacing--lg) var(--spacing--lg) 0; box-sizing: border-box; background: var(--background--subtle); border-radius: var(--radius--md);">
				<div style="max-width: 45rem; margin-inline: auto; display: flex; flex-direction: column; gap: var(--spacing--lg); padding-block-end: var(--spacing--2xl);">
					<N8nSettingsSection title="Webhook" description="Scroll the panel — the save bar floats above the bottom, then docks after the last row at the end.">
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
					'With `floating`, the bar is `position: sticky` at the bottom of its container, so it hovers over the settings column (not the full window width) while there is more content below the fold. Scroll to the end and it settles into its natural in-flow position after the last settings row — and since it no longer overlays anything there, its surface, border, and shadow dissolve so it reads as part of the page. Scroll back up and the overlay chrome fades in as it detaches. It just needs to be the last child of the settings content column; no flex or min-height wiring.',
			},
		},
	},
};

export const ShortPage: Story = {
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
			<div style="height: 22rem; overflow-y: auto; padding: var(--spacing--lg) var(--spacing--lg) 0; box-sizing: border-box; background: var(--background--subtle); border-radius: var(--radius--md);">
				<div style="max-width: 45rem; margin-inline: auto; display: flex; flex-direction: column; gap: var(--spacing--lg); padding-block-end: var(--spacing--2xl);">
					<N8nSettingsSection title="Webhook" description="One row; the page never scrolls.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow title="Endpoint" description="A high-impact instance setting that requires an explicit save." :action-fill="true">
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
					'Corner case: a page shorter than the scrollport. Floating never engages — the bar simply rests in flow after the last (only) row, top-anchored with the content rather than pinned to the bottom of the empty panel, and in its chrome-less docked look since it overlays nothing. The alternative (pinning to the viewport bottom across a large gap of empty space) was considered and rejected.',
			},
		},
	},
};

export const AppearsAtPageEnd: Story = {
	render: () => ({
		components: {
			N8nSettingsSaveBar,
			N8nSettingsSection,
			N8nSettingsRowGroup,
			N8nSettingsRow,
			N8nInput,
		},
		setup() {
			const saved = ref(Array.from({ length: 6 }, () => 'https://collector.internal'));
			const draft = ref([...saved.value]);
			const dirty = computed(() => draft.value.some((value, i) => value !== saved.value[i]));
			const panel = ref<HTMLElement | null>(null);
			onMounted(() => {
				if (panel.value) panel.value.scrollTop = panel.value.scrollHeight;
			});
			const onDiscard = () => {
				draft.value = [...saved.value];
			};
			const onSave = () => {
				saved.value = [...draft.value];
				confirmSaved('Settings saved');
			};
			return { draft, dirty, panel, onDiscard, onSave };
		},
		template: `
			<div ref="panel" style="height: 22rem; overflow-y: auto; padding: var(--spacing--lg) var(--spacing--lg) 0; box-sizing: border-box; background: var(--background--subtle); border-radius: var(--radius--md);">
				<div style="max-width: 45rem; margin-inline: auto; display: flex; flex-direction: column; gap: var(--spacing--lg); padding-block-end: var(--spacing--2xl);">
					<N8nSettingsSection title="Webhook" description="You start scrolled to the end of the page. Edit any field to reveal the bar.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow v-for="n in 6" :key="n" :title="'Setting ' + n" description="A high-impact instance setting that requires an explicit save." :action-fill="true">
								<template #action><N8nInput v-model="draft[n - 1]" /></template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>
					<N8nSettingsSaveBar floating :visible="dirty" @save="onSave" @discard="onDiscard" />
				</div>
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'Corner case: the bar appears while the user is already scrolled to the very end. Mounting the bar makes the page taller, so it slides in floating above the panel bottom — briefly overlapping the tail of the content — and a small extra scroll docks it below the last row, where its chrome dissolves. Discard or Save hides the bar again, shrinking the page back.',
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
					confirmSaved('Settings saved');
				}, 1000);
			};
			const onDiscard = () => {
				draft.value = saved.value;
			};

			return { draft, saving, dirty, onSave, onDiscard };
		},
		template: `
			<div style="max-width: 45rem; padding: var(--spacing--lg); display: flex; flex-direction: column; gap: var(--spacing--lg);">
				<N8nSettingsSection title="Collector connection" description="Edit the endpoint to reveal the save bar. Discard reverts it; Save confirms with the app notification.">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="OTLP endpoint" description="Where to send OTLP traces." :action-fill="true">
							<template #action><N8nInput v-model="draft" /></template>
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
					"The full explicit-save loop: editing the field flips a dirty flag that drives `visible`, so the bar slides up. Discard reverts the draft (hiding the bar); Save shows the loading state, then hides the bar and confirms through n8n's existing bottom-right notification. Cmd/Ctrl+S also saves while the bar is visible. The page is shorter than the viewport, so the floating bar rests in flow in its chrome-less docked look — the same state a real short settings page would show.",
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
					confirmSaved('Settings saved');
				}, 1000);
			};
			const onDiscard = () => {
				draft.value = { ...saved.value };
			};
			const onToggleTelemetry = () => {
				// Low-impact: persists immediately and confirms with the same app notification.
				confirmSaved('Settings saved');
			};

			return { draft, saving, dirty, telemetry, onSave, onDiscard, onToggleTelemetry };
		},
		// The bar is the LAST CHILD OF THE SETTINGS COLUMN. This page is shorter than the
		// viewport, so the floating bar rests in flow right after the last section — floating
		// only kicks in when there is more content below the fold.
		template: `
			<div style="min-height: 100vh; box-sizing: border-box; padding: var(--spacing--lg); background: var(--background--subtle);">
				<div style="width: 100%; max-width: 45rem; margin-inline: auto; display: flex; flex-direction: column; gap: var(--spacing--xl);">
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
			</div>
		`,
	}),
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				story:
					'A realistic settings page combining both save modes: the high-impact Instance fields drive the floating explicit-save bar, while the low-impact telemetry toggle saves instantly. Both confirm through the existing app notification. The page is deliberately shorter than the viewport to show the floating bar at rest: it sits in flow right after the last section, since floating only engages while there is more content below the fold.',
			},
		},
	},
};
