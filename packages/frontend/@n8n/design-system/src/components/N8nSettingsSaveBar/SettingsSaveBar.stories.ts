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
					'The explicit-save affordance for high-impact instance settings. It stays hidden until there are unsaved changes, then slides up showing an "Unsaved changes" status on the left plus Discard (outline) and Save (solid) actions on the right — the primary action sits on the far right, consistent with dialogs. It is presentational: the consumer owns `visible` (bind it to a dirty flag), `saving`, and reacts to `save`/`discard`. On a successful save, hide the bar and confirm through the existing app notification (`useToast().showMessage` in the app). The bar is a gently rounded (12px) bordered rectangle with a prominent shadow that spans its container — the settings content column — plus its own 12px side padding (720px column → 744px bar), so it sits a touch proud of the column while its inner edges align exactly with the settings rows: the status message starts on the rows\' left edge and the Save button ends on their right edge. Render it as the last child of the settings content column; set `floating` to make it float 24px above the bottom of the scrollport while there is more content below the fold — at the end of the page (or on pages shorter than the scrollport) it settles into flow after the last settings row. Plain `position: sticky`, no host wiring needed. Mirrors Figma 5991:7910.',
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
			<div style="height: 22rem; overflow-y: auto; padding: var(--spacing--lg); box-sizing: border-box; background: var(--background--subtle); border-radius: var(--radius--md);">
				<div style="max-width: 45rem; margin-inline: auto; display: flex; flex-direction: column; gap: var(--spacing--lg);">
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
					'With `floating`, the bar is `position: sticky` at the bottom of its container, so it hovers over the settings column (not the full window width) while there is more content below the fold. Scroll to the end and it settles into its natural in-flow position after the last settings row — the same place it rests on pages shorter than the scrollport. It just needs to be the last child of the settings content column; no flex or min-height wiring.',
			},
		},
	},
};

export const DockedAtEnd: Story = {
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
			const panel = ref<HTMLElement | null>(null);
			onMounted(() => {
				if (panel.value) panel.value.scrollTop = panel.value.scrollHeight;
			});
			return { value, panel };
		},
		template: `
			<div ref="panel" style="height: 22rem; overflow-y: auto; padding: var(--spacing--lg); box-sizing: border-box; background: var(--background--subtle); border-radius: var(--radius--md);">
				<div style="max-width: 45rem; margin-inline: auto; display: flex; flex-direction: column; gap: var(--spacing--lg);">
					<N8nSettingsSection title="Webhook" description="The panel starts scrolled to the very end.">
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
					'Corner case: the end-of-page resting state. The panel starts scrolled to the very end, so the floating bar is DOCKED — sitting in flow 24px below the last settings row instead of hovering over content. Scroll up a little and it detaches back into its floating position. This is the moment where floating and in-flow behavior hand over to each other; judge whether the docked resting spot feels natural.',
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
			<div style="height: 22rem; overflow-y: auto; padding: var(--spacing--lg); box-sizing: border-box; background: var(--background--subtle); border-radius: var(--radius--md);">
				<div style="max-width: 45rem; margin-inline: auto; display: flex; flex-direction: column; gap: var(--spacing--lg);">
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
					'Corner case: a page shorter than the scrollport. Floating never engages — the bar simply rests in flow 24px after the last (only) row, top-anchored with the content rather than pinned to the bottom of the empty panel. The alternative (pinning to the viewport bottom across a large gap of empty space) was considered and rejected.',
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
			const saved = 'https://collector.internal';
			const draft = ref(saved);
			const dirty = computed(() => draft.value !== saved);
			const panel = ref<HTMLElement | null>(null);
			onMounted(() => {
				if (panel.value) panel.value.scrollTop = panel.value.scrollHeight;
			});
			const onDiscard = () => {
				draft.value = saved;
			};
			const onSave = () => {
				draft.value = saved;
				confirmSaved('Settings saved');
			};
			return { draft, dirty, panel, onDiscard, onSave };
		},
		template: `
			<div ref="panel" style="height: 22rem; overflow-y: auto; padding: var(--spacing--lg); box-sizing: border-box; background: var(--background--subtle); border-radius: var(--radius--md);">
				<div style="max-width: 45rem; margin-inline: auto; display: flex; flex-direction: column; gap: var(--spacing--lg);">
					<N8nSettingsSection title="Webhook" description="You are already at the end of the page. Edit the LAST field to reveal the bar.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow v-for="n in 5" :key="n" :title="'Setting ' + n" description="A high-impact instance setting that requires an explicit save." :action-fill="true">
								<template #action><N8nInput :model-value="''" placeholder="Scroll target" /></template>
							</N8nSettingsRow>
							<N8nSettingsRow title="OTLP endpoint" description="Edit me — the bar appears while you are at the page end." :action-fill="true">
								<template #action><N8nInput v-model="draft" /></template>
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
					'Corner case: the bar APPEARS while the user is already scrolled to the very end. Mounting the bar makes the page taller, so it slides in floating 24px above the panel bottom — briefly overlapping the tail of the content — and a small extra scroll docks it below the last row. Judge whether that momentary overlap is acceptable; the alternative (pages permanently reserving bottom padding for a bar that is usually hidden) is what this design avoids. Discard or Save hides the bar again, shrinking the page back.',
			},
		},
	},
};

export const NarrowColumn: Story = {
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
			<div style="max-width: 22.5rem; padding: var(--spacing--lg); display: flex; flex-direction: column; gap: var(--spacing--lg);">
				<N8nSettingsSection title="Webhook" description="A 360px column, e.g. a split view or a small window.">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Endpoint" description="A high-impact setting." :action-fill="true">
							<template #action><N8nInput v-model="value" placeholder="Edit me" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
				<N8nSettingsSaveBar :visible="true" @save="() => {}" @discard="() => {}" />
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'Corner case: a narrow settings column (360px). The bar sizes off the column, so it shrinks with it while keeping its 12px side overhang; the status message wraps first (its box may shrink), while the action buttons keep their intrinsic size. Judge whether the wrapped layout is acceptable at this width or whether the bar should stack its rows on narrow columns.',
			},
		},
	},
};

export const LongLabels: Story = {
	render: () => ({
		components: { N8nSettingsSaveBar },
		template: `
			<div style="max-width: 45rem; padding: var(--spacing--lg);">
				<N8nSettingsSaveBar
					:visible="true"
					message="You have unsaved changes to the collector connection and tracing configuration"
					save-label="Save and apply configuration"
					discard-label="Discard all pending changes"
					@save="() => {}"
					@discard="() => {}"
				/>
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'Corner case: verbose copy (long status message and long button labels, e.g. after translation). The status text wraps within its flexible box while the buttons keep their intrinsic width; nothing truncates silently. Judge whether multi-line status text is acceptable or whether the message should truncate with an ellipsis.',
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
