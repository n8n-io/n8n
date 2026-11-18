<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import {
	N8nButton,
	N8nInput,
	N8nSelect2,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import ColorHexInput from '@/app/components/ColorHexInput.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { applyThemeInstantly } from '@/app/stores/ui.utils';
import {
	CUSTOM_THEME_PRESETS,
	customTheme,
	detectMode,
	injectCustomThemeStyle,
	saveCustomTheme,
	type CustomTheme,
	type CustomThemeSeeds,
} from '@/app/utils/customTheme';

const i18n = useI18n();
const route = useRoute();
const uiStore = useUIStore();
const { showMessage } = useToast();

const SEED_KEYS: Array<{ key: keyof CustomThemeSeeds; label: BaseTextKey }> = [
	{ key: 'background', label: 'settings.personal.customTheme.seed.background' },
	{ key: 'surface', label: 'settings.personal.customTheme.seed.surface' },
	{ key: 'text', label: 'settings.personal.customTheme.seed.text' },
	{ key: 'primary', label: 'settings.personal.customTheme.seed.primary' },
	{ key: 'accent', label: 'settings.personal.customTheme.seed.accent' },
];

function initialTheme(): CustomTheme {
	const saved = customTheme.value;
	if (saved) return { ...saved, seeds: { ...saved.seeds } };
	const seeds = { ...CUSTOM_THEME_PRESETS['default-dark'].seeds };
	return {
		name: i18n.baseText('settings.personal.theme.custom'),
		mode: detectMode(seeds.background),
		seeds,
	};
}

const draft = reactive<CustomTheme>(initialTheme());
const preset = ref<string | undefined>(undefined);
const isPreviewing = ref(false);

const presetItems = computed((): Array<SelectOptionBase<string>> =>
	Object.entries(CUSTOM_THEME_PRESETS).map(([value, { label }]) => ({ value, label })),
);

function snapshot(): CustomTheme {
	return { name: draft.name, mode: draft.mode, seeds: { ...draft.seeds } };
}

function preview() {
	draft.mode = detectMode(draft.seeds.background);
	isPreviewing.value = true;
	injectCustomThemeStyle(snapshot());
	document.body.setAttribute('data-palette', 'custom');
	document.body.setAttribute('data-theme', draft.mode);
}

function restore() {
	if (!isPreviewing.value) return;
	isPreviewing.value = false;
	injectCustomThemeStyle(customTheme.value);
	applyThemeInstantly({ mode: uiStore.themeMode, family: uiStore.themeFamily });
}

watch(() => ({ ...draft.seeds }), preview);

function onPresetChange(value: SelectValue | undefined) {
	if (typeof value !== 'string' || !CUSTOM_THEME_PRESETS[value]) return;
	preset.value = value;
	Object.assign(draft.seeds, CUSTOM_THEME_PRESETS[value].seeds);
}

async function onCancel() {
	Object.assign(draft, initialTheme());
	preset.value = undefined;
	await nextTick();
	restore();
}

function onApply() {
	const theme = snapshot();
	theme.mode = detectMode(theme.seeds.background);
	if (!theme.name.trim()) theme.name = i18n.baseText('settings.personal.theme.custom');
	saveCustomTheme(theme);
	isPreviewing.value = false;
	if (uiStore.themeMode !== 'system' && uiStore.themeMode !== theme.mode) {
		uiStore.setThemeMode(theme.mode);
	}
	uiStore.setThemeFamily('custom', theme.mode);
	showMessage({ title: i18n.baseText('settings.personal.customTheme.applied'), type: 'success' });
}

const sectionRef = ref<HTMLElement | null>(null);

onMounted(() => {
	if (route.hash === '#custom-theme') {
		void nextTick(() => sectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
	}
});

onBeforeUnmount(restore);
</script>

<template>
	<div id="custom-theme" ref="sectionRef" data-test-id="custom-theme-editor">
		<N8nSettingsSection
			:title="i18n.baseText('settings.personal.customTheme')"
			:description="i18n.baseText('settings.personal.customTheme.description')"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow :title="i18n.baseText('settings.personal.customTheme.name')" action-fill>
					<template #action>
						<N8nInput
							v-model="draft.name"
							size="medium"
							:maxlength="32"
							:aria-label="i18n.baseText('settings.personal.customTheme.name')"
							data-test-id="custom-theme-name"
						/>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow :title="i18n.baseText('settings.personal.customTheme.startFrom')">
					<template #action>
						<N8nSelect2
							:model-value="preset"
							:items="presetItems"
							size="medium"
							:placeholder="i18n.baseText('settings.personal.customTheme.startFrom.placeholder')"
							:aria-label="i18n.baseText('settings.personal.customTheme.startFrom')"
							data-test-id="custom-theme-preset"
							@update:model-value="onPresetChange"
						/>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					v-for="(seed, index) in SEED_KEYS"
					:key="seed.key"
					:title="i18n.baseText(seed.label)"
					:show-divider="index === SEED_KEYS.length - 1"
					:class="[
						$style.seedRow,
						{
							[$style.seedRowFirst]: index === 0,
							[$style.seedRowLast]: index === SEED_KEYS.length - 1,
						},
					]"
				>
					<template #action>
						<ColorHexInput
							v-model="draft.seeds[seed.key]"
							:label="i18n.baseText(seed.label)"
							:test-id="`custom-theme-seed-${seed.key}`"
						/>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow>
					<template #action>
						<div :class="$style.actions">
							<N8nButton
								variant="outline"
								size="medium"
								:label="i18n.baseText('settings.personal.customTheme.cancel')"
								:disabled="!isPreviewing"
								data-test-id="custom-theme-cancel"
								@click="onCancel"
							/>
							<N8nButton
								size="medium"
								:label="i18n.baseText('settings.personal.customTheme.apply')"
								data-test-id="custom-theme-apply"
								@click="onApply"
							/>
						</div>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
	</div>
</template>

<style lang="scss" module>
/* The row and its header force a tall min-height. The colour rows stack tightly instead. */
.seedRow.seedRow {
	min-height: 0;
	padding-block: var(--spacing--4xs);

	> * {
		min-height: 0;
	}
}

.seedRow.seedRowFirst {
	padding-top: var(--spacing--xs);
}

.seedRow.seedRowLast {
	padding-bottom: var(--spacing--xs);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
