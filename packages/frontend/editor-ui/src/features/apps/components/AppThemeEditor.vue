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
import type { App, AppTheme } from '@/features/apps/apps.types';

const props = defineProps<{
	projectId: string;
	app: App;
}>();

const emit = defineEmits<{ applied: [App] }>();

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();

// Matches the template's own src/style.css defaults, so an app with no saved
// theme yet shows the values it's actually rendering.
const DEFAULT_ACCENT = '#18181b';
const DEFAULT_RADIUS = 10;
const SYSTEM_FONT = 'system';

const ACCENT_PRESETS = ['#18181b', '#4f46e5', '#0d9488', '#c2410c', '#be185d'];

const FONT_OPTIONS: Array<{ value: string; label: string }> = [
	{ value: 'Inter, ui-sans-serif, system-ui, sans-serif', label: 'Inter' },
	{ value: 'Geist, ui-sans-serif, system-ui, sans-serif', label: 'Geist' },
	{ value: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif', label: 'IBM Plex Sans' },
	{ value: SYSTEM_FONT, label: i18n.baseText('apps.builder.theme.font.systemDefault') },
];

const accentColor = ref(props.app.theme?.vars['--primary'] ?? DEFAULT_ACCENT);
const mode = ref<AppTheme['mode']>(props.app.theme?.mode ?? 'system');
const font = ref(props.app.theme?.vars['--font-sans'] ?? SYSTEM_FONT);
const radius = ref(parsePxRadius(props.app.theme?.vars['--radius']) ?? DEFAULT_RADIUS);
const applying = ref(false);

// Switching apps (route param change) reuses this component instance.
watch(
	() => props.app.id,
	() => {
		accentColor.value = props.app.theme?.vars['--primary'] ?? DEFAULT_ACCENT;
		mode.value = props.app.theme?.mode ?? 'system';
		font.value = props.app.theme?.vars['--font-sans'] ?? SYSTEM_FONT;
		radius.value = parsePxRadius(props.app.theme?.vars['--radius']) ?? DEFAULT_RADIUS;
	},
);

function parsePxRadius(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

const modeOptions = computed(() => [
	{ label: i18n.baseText('apps.builder.theme.mode.light'), value: 'light' as const },
	{ label: i18n.baseText('apps.builder.theme.mode.dark'), value: 'dark' as const },
	{ label: i18n.baseText('apps.builder.theme.mode.system'), value: 'system' as const },
]);

const theme = computed<AppTheme>(() => ({
	mode: mode.value,
	vars: {
		'--primary': accentColor.value ?? DEFAULT_ACCENT,
		'--radius': `${radius.value}px`,
		...(font.value === SYSTEM_FONT ? {} : { '--font-sans': font.value }),
	},
}));

const onSave = async () => {
	applying.value = true;
	try {
		const updated = await appsStore.applyAppTheme(props.projectId, props.app.id, theme.value);
		emit('applied', updated);
		toast.showMessage({
			title: i18n.baseText('apps.builder.theme.applied'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.theme.error'));
	} finally {
		applying.value = false;
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
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<div :class="$style.footer">
			<N8nButton :loading="applying" data-test-id="app-theme-save" @click="onSave">
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
