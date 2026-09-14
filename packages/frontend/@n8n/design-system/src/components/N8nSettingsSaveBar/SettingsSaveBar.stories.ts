import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, onMounted, ref } from 'vue';

import { confirmSaved } from './quickSaveNotification';
import N8nSettingsSaveBar from './SettingsSaveBar.vue';
import N8nInput from '../N8nInput';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSettingsSection from '../N8nSettingsSection';
import N8nSwitch from '../N8nSwitch';

// Shared scaffolding for the scrolling-panel stories: a fixed-height scroll panel hosting the
// width-capped settings column the bar is the last child of.
const scrollPanelStyle =
	'height: 22rem; overflow-y: auto; padding: var(--spacing--lg) var(--spacing--lg) 0; box-sizing: border-box; background: var(--background--subtle); border-radius: var(--radius--md);';
const settingsColumnStyle =
	'max-width: 45rem; margin-inline: auto; display: flex; flex-direction: column; gap: var(--spacing--lg); padding-block-end: var(--spacing--2xl);';
const storyComponents = {
	N8nSettingsSaveBar,
	N8nSettingsSection,
	N8nSettingsRowGroup,
	N8nSettingsRow,
	N8nInput,
};

const meta = {
	title: 'Areas/Settings/SettingsSaveBar',
	component: N8nSettingsSaveBar,
	parameters: {
		docs: {
			description: {
				component: [
					'The explicit-save affordance for high-impact instance settings. It stays hidden until the page has unsaved changes, then slides up with an "Unsaved changes" status on the left and Discard (outline) + Save (solid) actions on the right — the primary action sits on the far right, consistent with dialogs. It is presentational: the consumer owns `visible` (bind it to a dirty flag) and `saving`, and reacts to `save`/`discard`. On a successful save, hide the bar and confirm through the existing app notification (`useToast().showMessage` in the app). Cmd/Ctrl+S also triggers a save while the bar is visible and enabled.',
					"The bar has two visual states that hand over automatically as the user scrolls. **Default** is the resting state: the bar sits in the normal page flow after the last settings row, chrome-less (no surface, border, or shadow), with its content aligned to the settings rows' inner content line — it reads as the page's own closing row. **Floating** engages only while there is more content below the fold: the bar sticks 24px above the bottom of the scrollport and puts on its overlay chrome — a gently rounded (12px) bordered surface with a shadow spanning the settings column plus a 12px side overhang (720px column → 744px bar), its inner edges aligned exactly with the rows' outer edges. On handover the chrome fades (200ms, DS ease-out) and the content tuck settles on the DS spring curve.",
					'Hosting contract: render the bar as the **last child of the settings content column** and set `floating`. Keep the page\'s bottom padding on the content inside the scroll container (as `N8nSettingsLayout` does), not on the scroll container itself. No flex or min-height wiring is needed — positioning is plain `position: sticky` plus an internal stuck-state observer. The bar is always one line tall: the status message truncates with an ellipsis, and the default "Unsaved changes" copy should be kept unless the page has a strong reason to differ. Mirrors Figma 5991:7910.',
				].join('\n\n'),
			},
		},
	},
} satisfies Meta<typeof N8nSettingsSaveBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		components: storyComponents,
		setup() {
			const value = ref('');
			return { value };
		},
		template: `
			<div style="${scrollPanelStyle}">
				<div style="${settingsColumnStyle}">
					<N8nSettingsSection title="Webhook" description="One row; the page never scrolls.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow title="Endpoint" description="A high-impact instance setting that requires an explicit save." :action-fill="true">
								<template #action><N8nInput v-model="value" placeholder="Edit me" /></template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>
					<N8nSettingsSaveBar floating />
				</div>
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					"The main state. Docked is not opted into — it is what `floating` resolves to whenever nothing is below the fold: on a page shorter than the scrollport (like here), or on a long page once the user scrolls to the end. The bar rests in flow after the last settings row, chrome-less, its status icon and Save button aligned with the rows' inner content. The alternative for short pages (pinning to the viewport bottom across a gap of empty space) was considered and rejected.",
			},
		},
	},
};

export const Floating: Story = {
	render: () => ({
		components: storyComponents,
		setup() {
			const value = ref('');
			return { value };
		},
		template: `
			<div style="${scrollPanelStyle}">
				<div style="${settingsColumnStyle}">
					<N8nSettingsSection title="Webhook" description="Scroll the panel — the save bar floats above the bottom, then docks after the last row at the end.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow v-for="n in 6" :key="n" :title="'Setting ' + n" description="A high-impact instance setting that requires an explicit save." :action-fill="true">
								<template #action><N8nInput v-model="value" placeholder="Edit me" /></template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>
					<N8nSettingsSaveBar floating />
				</div>
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					"The overlay state. With `floating`, the bar is `position: sticky` at the bottom of its container, so it hovers over the settings column (not the full window width) while there is more content below the fold. Scroll to the end and it settles into its natural in-flow position after the last settings row — and since it no longer overlays anything there, its surface, border, and shadow dissolve and its content tucks in to the rows' content line (see Default). Scroll back up and the overlay chrome fades in as it detaches.",
			},
		},
	},
};

export const AppearsOnEdit: Story = {
	render: () => ({
		components: storyComponents,
		setup() {
			const saved = ref(Array.from({ length: 6 }, () => 'https://collector.internal'));
			const draft = ref([...saved.value]);
			const saving = ref(false);
			const dirty = computed(() => draft.value.some((value, i) => value !== saved.value[i]));
			const panel = ref<HTMLElement | null>(null);
			onMounted(() => {
				if (panel.value) panel.value.scrollTop = panel.value.scrollHeight;
			});
			const onDiscard = () => {
				draft.value = [...saved.value];
			};
			const onSave = () => {
				saving.value = true;
				// Simulate a request; on success commit the draft, hide the bar, and confirm.
				setTimeout(() => {
					saved.value = [...draft.value];
					saving.value = false;
					confirmSaved('Settings saved');
				}, 1000);
			};
			return { draft, dirty, saving, panel, onDiscard, onSave };
		},
		template: `
			<div ref="panel" style="${scrollPanelStyle}">
				<div style="${settingsColumnStyle}">
					<N8nSettingsSection title="Webhook" description="You start scrolled to the end of the page. Edit any field to reveal the bar; Discard reverts, Save shows its loading state and confirms.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow v-for="n in 6" :key="n" :title="'Setting ' + n" description="A high-impact instance setting that requires an explicit save." :action-fill="true">
								<template #action><N8nInput v-model="draft[n - 1]" /></template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>
					<N8nSettingsSaveBar floating :visible="dirty" :saving="saving" @save="onSave" @discard="onDiscard" />
				</div>
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'The full interaction loop. Editing any field flips a dirty flag that drives `visible`, so the bar slides up; Discard reverts the draft (hiding the bar again), Save shows the loading state, then hides the bar and confirms through the app notification. This story starts scrolled to the very end to also show the trickiest appearance: mounting the bar makes the page taller, so it slides in floating above the panel bottom — briefly overlapping the tail of the content — and a small extra scroll docks it below the last row, where its chrome dissolves.',
			},
		},
	},
};

export const Saving: Story = {
	render: () => ({
		components: { N8nSettingsSaveBar },
		template: `
			<div style="max-width: 48rem; padding: var(--spacing--lg);">
				<N8nSettingsSaveBar :saving="true" />
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'While a save is in flight the Save button shows its loading state and Discard is disabled.',
			},
		},
	},
};

export const SettingsFlow: Story = {
	render: () => ({
		components: { ...storyComponents, N8nSwitch },
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
					'A realistic settings page combining both save modes on one screen: the high-impact Instance fields drive the explicit-save bar, while the low-impact telemetry toggle saves instantly — both confirm through the same app notification. The page is shorter than the viewport, so the bar appears docked right after the last section.',
			},
		},
	},
};
