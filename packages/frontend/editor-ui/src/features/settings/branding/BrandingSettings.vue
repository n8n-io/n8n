<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
	N8nButton,
	N8nColorPicker,
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
import { applyAccentColor, resolveAccent } from '@/app/utils/accentColor';

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const documentTitle = useDocumentTitle();

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const savedColor = computed(() => settingsStore.settings.branding?.accentColor ?? null);
const draft = ref<string | null>(savedColor.value);
const saving = ref(false);

const normalizedDraft = computed(() => draft.value?.toLowerCase() ?? null);
const isValid = computed(() => draft.value === null || HEX_COLOR.test(draft.value));
const isDirty = computed(() => normalizedDraft.value !== savedColor.value);

// n8n moves a color that is too light or too dark for one mode, so buttons stay visible.
const isAdjusted = computed(() => {
	if (!isValid.value || normalizedDraft.value === null) return false;
	const { light, dark } = resolveAccent(normalizedDraft.value);
	return (
		light.toLowerCase() !== normalizedDraft.value || dark.toLowerCase() !== normalizedDraft.value
	);
});

// The page previews the draft on the whole app. Leaving the page shows the saved color again.
watch(normalizedDraft, (color) => {
	if (isValid.value) applyAccentColor(color);
});
onBeforeUnmount(() => applyAccentColor(savedColor.value));

onMounted(() => documentTitle.set(i18n.baseText('settings.branding')));

async function onSave() {
	if (!isValid.value) return;
	saving.value = true;
	try {
		const branding = await brandingApi.updateBranding(rootStore.restApiContext, {
			accentColor: normalizedDraft.value,
		});
		settingsStore.setSettings({ ...settingsStore.settings, branding });
		draft.value = branding.accentColor;
		toast.showMessage({ type: 'success', title: i18n.baseText('settings.branding.saved') });
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.branding.saveError'));
	} finally {
		saving.value = false;
	}
}

function onDiscard() {
	draft.value = savedColor.value;
}
</script>

<template>
	<N8nSettingsLayout>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.branding')"
			:description="i18n.baseText('settings.branding.description')"
		/>

		<N8nSettingsSection :title="i18n.baseText('settings.branding.colors')">
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					:title="i18n.baseText('settings.branding.accentColor')"
					:description="i18n.baseText('settings.branding.accentColor.description')"
				>
					<template #action>
						<div :class="$style.accentActions">
							<N8nButton
								variant="ghost"
								:label="i18n.baseText('settings.branding.reset')"
								:disabled="draft === null"
								data-test-id="branding-accent-color-reset"
								@click="draft = null"
							/>
							<N8nColorPicker v-model="draft" data-test-id="branding-accent-color" />
						</div>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					:title="i18n.baseText('settings.branding.preview')"
					:description="i18n.baseText('settings.branding.preview.description')"
				>
					<template #action>
						<N8nButton
							variant="brand"
							:label="i18n.baseText('settings.branding.preview.button')"
							data-test-id="branding-preview-button"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
			<N8nText v-if="isAdjusted" size="small" color="text-light" data-test-id="branding-adjusted">
				{{ i18n.baseText('settings.branding.adjusted') }}
			</N8nText>
		</N8nSettingsSection>

		<N8nSettingsSaveBar
			floating
			:visible="isDirty"
			:saving="saving"
			:save-disabled="!isValid"
			@save="onSave"
			@discard="onDiscard"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.accentActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
