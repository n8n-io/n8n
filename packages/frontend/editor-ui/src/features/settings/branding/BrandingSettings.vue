<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
	N8nButton,
	N8nIcon,
	N8nLink,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSaveBar,
	N8nSettingsSection,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import * as brandingApi from '@n8n/rest-api-client/api/branding';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import ColorHexInput from '@/app/components/ColorHexInput.vue';
import {
	accentContrast,
	applyAccentColor,
	autoDarkAccent,
	brandTokens,
	readDefaultAccent,
	suggestAccent,
	type AccentMode,
} from '@/app/utils/accentColor';

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const documentTitle = useDocumentTitle();

const savedLight = computed(() => settingsStore.settings.branding?.accentColor ?? null);
const savedDark = computed(() => settingsStore.settings.branding?.accentColorDark ?? null);

// `null` light means the theme default. `null` dark means "follow the light value".
const draftLight = ref<string | null>(savedLight.value);
const draftDark = ref<string | null>(savedDark.value);
const saving = ref(false);

const isDirty = computed(
	() => draftLight.value !== savedLight.value || draftDark.value !== savedDark.value,
);

const defaults = {
	light: readDefaultAccent('light') ?? '#000000',
	dark: readDefaultAccent('dark') ?? '#ffffff',
};

const effective = computed<Record<AccentMode, string>>(() => ({
	light: draftLight.value ?? defaults.light,
	dark:
		draftDark.value ?? (draftLight.value ? autoDarkAccent(draftLight.value) : defaults.dark),
}));

const lightModel = computed({
	get: () => effective.value.light,
	set: (color: string) => {
		draftLight.value = color;
	},
});
const darkModel = computed({
	get: () => effective.value.dark,
	set: (color: string) => {
		draftDark.value = color;
	},
});

// The n8n default colors are not checked: only colors that an admin set.
function contrastWarning(mode: AccentMode) {
	const custom = mode === 'light' ? draftLight.value : (draftDark.value ?? draftLight.value);
	if (!custom) return null;
	const color = effective.value[mode];
	const contrast = accentContrast(color, mode);
	if (contrast.passes) return null;
	const textFails = contrast.text < 4.5;
	const ratio = (textFails ? contrast.text : contrast.surface).toFixed(1);
	return {
		message: i18n.baseText(
			textFails ? 'settings.branding.contrast.text' : 'settings.branding.contrast.surface',
			{ interpolate: { ratio } },
		),
		suggestion: suggestAccent(color, mode),
	};
}

const rows = computed(() =>
	(['light', 'dark'] as const).map((mode) => ({
		mode,
		title: i18n.baseText(
			mode === 'light' ? 'settings.branding.accentColor.light' : 'settings.branding.accentColor.dark',
		),
		description: i18n.baseText(
			mode === 'light'
				? 'settings.branding.accentColor.description'
				: 'settings.branding.accentColor.dark.description',
		),
		linked: mode === 'dark' && draftDark.value === null,
		resetLabel: i18n.baseText(
			mode === 'light' ? 'settings.branding.reset' : 'settings.branding.accentColor.useAutomatic',
		),
		resetDisabled: mode === 'light' ? draftLight.value === null : draftDark.value === null,
		warning: contrastWarning(mode),
	})),
);

function onReset(mode: AccentMode) {
	if (mode === 'light') draftLight.value = null;
	else draftDark.value = null;
}

function onUseSuggested(mode: AccentMode, color: string) {
	if (mode === 'light') draftLight.value = color;
	else draftDark.value = color;
}

// The page previews the draft on the whole app. Leaving the page shows the saved colors again.
watch([draftLight, draftDark], ([light, dark]) => applyAccentColor(light, dark));
onBeforeUnmount(() => applyAccentColor(savedLight.value, savedDark.value));

onMounted(() => documentTitle.set(i18n.baseText('settings.branding')));

async function onSave() {
	saving.value = true;
	try {
		const branding = await brandingApi.updateBranding(rootStore.restApiContext, {
			accentColor: draftLight.value,
			accentColorDark: draftDark.value,
		});
		settingsStore.setSettings({ ...settingsStore.settings, branding });
		draftLight.value = branding.accentColor;
		draftDark.value = branding.accentColorDark ?? null;
		toast.showMessage({ type: 'success', title: i18n.baseText('settings.branding.saved') });
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.branding.saveError'));
	} finally {
		saving.value = false;
	}
}

function onDiscard() {
	draftLight.value = savedLight.value;
	draftDark.value = savedDark.value;
}
</script>

<template>
	<N8nSettingsLayout>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.branding')"
			:description="i18n.baseText('settings.branding.description')"
			:show-docs-link="false"
		/>

		<N8nSettingsSection :title="i18n.baseText('settings.branding.colors')">
			<N8nSettingsRowGroup>
				<N8nSettingsRow v-for="row in rows" :key="row.mode">
					<template #info>
						<N8nText bold size="medium" color="text-dark">{{ row.title }}</N8nText>
						<N8nText size="small" color="text-light">{{ row.description }}</N8nText>
						<span
							v-if="row.warning"
							:class="$style.warning"
							:data-test-id="`branding-contrast-${row.mode}`"
						>
							<N8nIcon icon="triangle-alert" size="small" />
							<N8nText size="small" color="warning">{{ row.warning.message }}</N8nText>
							<N8nLink
								v-if="row.warning.suggestion"
								size="small"
								:data-test-id="`branding-contrast-${row.mode}-suggest`"
								@click="onUseSuggested(row.mode, row.warning.suggestion)"
							>
								{{ i18n.baseText('settings.branding.contrast.useSuggested') }}
							</N8nLink>
						</span>
					</template>
					<template #action>
						<div :class="$style.accentActions">
							<N8nText
								v-if="row.linked"
								:class="$style.automatic"
								size="small"
								color="text-light"
							>
								{{ i18n.baseText('settings.branding.accentColor.automatic') }}
							</N8nText>
							<N8nButton
								variant="ghost"
								icon="undo-2"
								icon-only
								:aria-label="row.resetLabel"
								:title="row.resetLabel"
								:disabled="row.resetDisabled"
								:data-test-id="`branding-accent-color-${row.mode}-reset`"
								@click="onReset(row.mode)"
							/>
							<ColorHexInput
								v-if="row.mode === 'light'"
								v-model="lightModel"
								:label="row.title"
								test-id="branding-accent-color-light"
							/>
							<ColorHexInput
								v-else
								v-model="darkModel"
								:label="row.title"
								test-id="branding-accent-color-dark"
							/>
						</div>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					:title="i18n.baseText('settings.branding.preview')"
					:description="i18n.baseText('settings.branding.preview.description')"
				>
					<template #action>
						<div :class="$style.previews">
							<div
								v-for="mode in ['light', 'dark'] as const"
								:key="mode"
								:data-theme="mode"
								:class="$style.preview"
								:style="brandTokens(effective[mode], mode)"
								:data-test-id="`branding-preview-${mode}`"
							>
								<N8nButton
									variant="brand"
									:label="i18n.baseText('settings.branding.preview.button')"
								/>
								<N8nText size="xsmall" color="text-light">
									{{ i18n.baseText(`settings.branding.preview.${mode}`) }}
								</N8nText>
							</div>
						</div>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSaveBar
			floating
			:visible="isDirty"
			:saving="saving"
			@save="onSave"
			@discard="onDiscard"
		>
			<span />
		</N8nSettingsSaveBar>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.accentActions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.automatic {
	margin-inline-end: var(--spacing--4xs);
	white-space: nowrap;
}

.warning {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--4xs);
	color: var(--color--warning);
}

.previews {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing--sm);
	padding-block: var(--spacing--md);
}

.preview {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius--lg);
	background: var(--background--subtle);
}
</style>
