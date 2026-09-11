<script setup lang="ts">
import {
	N8nButton,
	N8nColorPicker,
	N8nOption,
	N8nSegmentControl,
	N8nSelect,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, ref, watch } from 'vue';

import { useAppsStore } from '@/features/apps/apps.store';
import type { App, AppThemeSettings } from '@/features/apps/apps.types';

const props = defineProps<{
	projectId: string;
	app: App;
}>();

const emit = defineEmits<{ saved: [App] }>();

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();

// Matches the template's own src/style.css defaults, so an app with no saved
// theme yet shows the values it's actually rendering. #ff6900 is n8n's brand
// orange (--color--orange-500), converted from the template's oklch value.
const DEFAULTS: Required<Omit<AppThemeSettings, 'font'>> = {
	mode: 'system',
	primary: '#ff6900',
	radius: 4,
	density: 'comfortable',
	tone: 'neutral',
};
const SYSTEM_FONT = 'system';

const ACCENT_PRESETS = ['#ff6900', '#4f46e5', '#0d9488', '#be185d', '#18181b'];

// The tab only picks; the server derives the CSS variables (contrast, tints,
// spacing) and merges them onto the app's live theme-overrides.css, so anything
// Instance AI set on other variables survives a save here.

const FONT_OPTIONS: Array<{ value: string; label: string }> = [
	{ value: 'Inter, ui-sans-serif, system-ui, sans-serif', label: 'Inter' },
	{ value: 'Geist, ui-sans-serif, system-ui, sans-serif', label: 'Geist' },
	{ value: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif', label: 'IBM Plex Sans' },
	{ value: SYSTEM_FONT, label: i18n.baseText('apps.builder.theme.font.systemDefault') },
];

const saved = () => props.app.theme?.settings;
const accentColor = ref(saved()?.primary ?? DEFAULTS.primary);
const mode = ref<AppThemeSettings['mode']>(saved()?.mode ?? DEFAULTS.mode);
const font = ref(saved()?.font ?? SYSTEM_FONT);
const radius = ref(saved()?.radius ?? DEFAULTS.radius);
const density = ref<NonNullable<AppThemeSettings['density']>>(saved()?.density ?? DEFAULTS.density);
const tone = ref<NonNullable<AppThemeSettings['tone']>>(saved()?.tone ?? DEFAULTS.tone);
const saving = ref(false);

// Switching apps (route param change) reuses this component instance.
watch(
	() => props.app.id,
	() => {
		accentColor.value = saved()?.primary ?? DEFAULTS.primary;
		mode.value = saved()?.mode ?? DEFAULTS.mode;
		font.value = saved()?.font ?? SYSTEM_FONT;
		radius.value = saved()?.radius ?? DEFAULTS.radius;
		density.value = saved()?.density ?? DEFAULTS.density;
		tone.value = saved()?.tone ?? DEFAULTS.tone;
	},
);

const modeOptions = computed(() => [
	{ label: i18n.baseText('apps.builder.theme.mode.light'), value: 'light' as const },
	{ label: i18n.baseText('apps.builder.theme.mode.dark'), value: 'dark' as const },
	{ label: i18n.baseText('apps.builder.theme.mode.system'), value: 'system' as const },
]);

const densityOptions = computed(() => [
	{ label: i18n.baseText('apps.builder.theme.density.compact'), value: 'compact' as const },
	{
		label: i18n.baseText('apps.builder.theme.density.comfortable'),
		value: 'comfortable' as const,
	},
	{ label: i18n.baseText('apps.builder.theme.density.spacious'), value: 'spacious' as const },
]);

const toneOptions = computed(() => [
	{ label: i18n.baseText('apps.builder.theme.tone.neutral'), value: 'neutral' as const },
	{ label: i18n.baseText('apps.builder.theme.tone.tinted'), value: 'tinted' as const },
]);

const settings = computed<AppThemeSettings>(() => ({
	mode: mode.value,
	primary: accentColor.value ?? DEFAULTS.primary,
	radius: radius.value,
	density: density.value,
	tone: tone.value,
	...(font.value !== SYSTEM_FONT ? { font: font.value } : {}),
}));

const onSave = async () => {
	saving.value = true;
	try {
		const updated = await appsStore.applyAppTheme(props.projectId, props.app.id, settings.value);
		emit('saved', updated);
		toast.showMessage({
			title: i18n.baseText('apps.builder.theme.saved'),
			message: i18n.baseText('apps.builder.theme.saved.message'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.theme.error'));
	} finally {
		saving.value = false;
	}
};
</script>

<template>
	<div :class="$style.container" data-test-id="app-theme-editor">
		<N8nSettingsSection :title="i18n.baseText('apps.builder.theme.colors.title')">
			<N8nSettingsRowGroup>
				<N8nSettingsRow :title="i18n.baseText('apps.builder.theme.accent.label')">
					<template #action>
						<N8nColorPicker
							v-model="accentColor"
							size="small"
							:predefine="ACCENT_PRESETS"
							data-test-id="app-theme-accent"
						/>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow :title="i18n.baseText('apps.builder.theme.mode.label')">
					<template #action>
						<N8nSegmentControl
							v-model="mode"
							:options="modeOptions"
							size="small"
							data-test-id="app-theme-mode"
						/>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					:title="i18n.baseText('apps.builder.theme.tone.label')"
					:description="i18n.baseText('apps.builder.theme.tone.description')"
				>
					<template #action>
						<N8nSegmentControl
							v-model="tone"
							:options="toneOptions"
							size="small"
							data-test-id="app-theme-tone"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSection :title="i18n.baseText('apps.builder.theme.typeAndShape.title')">
			<N8nSettingsRowGroup>
				<N8nSettingsRow :title="i18n.baseText('apps.builder.theme.font.label')">
					<template #action>
						<N8nSelect v-model="font" size="small" data-test-id="app-theme-font">
							<N8nOption
								v-for="option in FONT_OPTIONS"
								:key="option.value"
								:value="option.value"
								:label="option.label"
							/>
						</N8nSelect>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow :title="i18n.baseText('apps.builder.theme.radius.label')">
					<template #action>
						<div :class="$style.radiusField">
							<input
								v-model.number="radius"
								type="range"
								min="0"
								max="24"
								data-test-id="app-theme-radius"
							/>
							<span>{{ radius }}px</span>
						</div>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					:title="i18n.baseText('apps.builder.theme.density.label')"
					:description="i18n.baseText('apps.builder.theme.density.description')"
				>
					<template #action>
						<N8nSegmentControl
							v-model="density"
							:options="densityOptions"
							size="small"
							data-test-id="app-theme-density"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<div :class="$style.footer">
			<N8nButton :loading="saving" data-test-id="app-theme-save" @click="onSave">
				{{ i18n.baseText('apps.builder.theme.save') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.radiusField {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;

	input {
		flex: 1;
	}

	span {
		min-width: 3ch;
		text-align: right;
		color: var(--text-color--subtle);
		font-size: var(--font-size--xs);
	}
}

.footer {
	display: flex;
	justify-content: flex-end;
}
</style>
