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
	/** Thread whose sandbox holds the draft; the theme files are written there so the live preview shows them. */
	threadId?: string;
}>();

const emit = defineEmits<{ saved: [App] }>();

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();

// Matches the template's own src/style.css defaults, so an app with no saved
// theme yet shows the values it's actually rendering. #ff6900 is n8n's brand
// orange (--color--orange-500), converted from the template's oklch value.
const DEFAULT_ACCENT = '#ff6900';
const DEFAULT_RADIUS = 4;
const SYSTEM_FONT = 'system';

const ACCENT_PRESETS = ['#ff6900', '#4f46e5', '#0d9488', '#be185d', '#18181b'];

/** WCAG relative luminance: picks readable text over whatever accent color the user chooses. */
function contrastForeground(hex: string): string {
	const channels = hex.match(/[0-9a-f]{2}/gi)?.map((c) => Number.parseInt(c, 16) / 255) ?? [];
	const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	const [r = 0, g = 0, b = 0] = channels;
	const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
	return luminance > 0.45 ? '#0a0a0a' : '#fafafa';
}

function hexToHue(hex: string): number {
	const channels = hex.match(/[0-9a-f]{2}/gi)?.map((c) => Number.parseInt(c, 16) / 255) ?? [];
	const [r = 0, g = 0, b = 0] = channels;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	if (max === min) return 0;
	const d = max - min;
	const hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
	return (hue * 60 + 360) % 360;
}

function hslToHex(h: number, s: number, l: number): string {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	const [r, g, b] =
		h < 60
			? [c, x, 0]
			: h < 120
				? [x, c, 0]
				: h < 180
					? [0, c, x]
					: h < 240
						? [0, x, c]
						: h < 300
							? [x, 0, c]
							: [c, 0, x];
	const toHex = (v: number) =>
		Math.round((v + m) * 255)
			.toString(16)
			.padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** A very light, low-saturation tint of the accent's hue — for secondary/accent surfaces. */
function tintOf(hex: string): string {
	return hslToHex(hexToHue(hex), 0.35, 0.95);
}

// The Theme tab is deliberately basic (accent, mode, font, radius); it derives
// --primary(-foreground), --ring, --secondary(-foreground), --accent(-foreground),
// --radius and --font-sans from those few inputs, rather than exposing every
// variable. Instance AI can still set any other shadcn/Tailwind variable
// directly by editing theme-overrides.css — the backend merges this tab's
// managed keys onto the app's *current* theme-overrides.css rather than
// replacing it, so a save here never wipes out variables the agent added.

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
const saving = ref(false);

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

const theme = computed<AppTheme>(() => {
	const primary = accentColor.value ?? DEFAULT_ACCENT;
	const tint = tintOf(primary);
	const managed: Record<string, string> = {
		'--primary': primary,
		'--primary-foreground': contrastForeground(primary),
		'--ring': primary,
		'--secondary': tint,
		'--secondary-foreground': '#18181b',
		'--accent': tint,
		'--accent-foreground': '#18181b',
		'--radius': `${radius.value}px`,
	};
	if (font.value !== SYSTEM_FONT) managed['--font-sans'] = font.value;

	// Only ever send the keys this tab manages — the backend merges them onto
	// the app's *live* theme-overrides.css, so anything Instance AI set
	// directly on other variables survives without this tab needing to know
	// about it (its own copy of the app's theme can otherwise go stale).
	return { mode: mode.value, vars: managed };
});

const onSave = async () => {
	saving.value = true;
	try {
		const updated = await appsStore.applyAppTheme(
			props.projectId,
			props.app.id,
			theme.value,
			props.threadId,
		);
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
