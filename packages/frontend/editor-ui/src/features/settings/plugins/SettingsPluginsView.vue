<script lang="ts" setup>
import { ref, useCssModule } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { ElSwitch } from 'element-plus';
import { N8nButton, N8nHeading, N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import * as pluginsSettingsApi from '@n8n/rest-api-client/api/plugins-settings';

const $style = useCssModule();
const rootStore = useRootStore();
const i18n = useI18n();
const { showToast, showError } = useToast();

const mergeDevEnabled = ref(false);
const apiKeyDraft = ref('');
const isSaving = ref(false);
const apiKeyError = ref('');

const { isLoading } = useAsyncState(async () => {
	const settings = await pluginsSettingsApi.getPluginsSettings(rootStore.restApiContext);
	mergeDevEnabled.value = settings.mergeDevEnabled;
	apiKeyDraft.value = settings.mergeDevApiKey;
	return settings;
}, undefined);

async function onMergeDevEnabledChange(value: string | number | boolean) {
	const boolValue = typeof value === 'boolean' ? value : Boolean(value);
	if (!boolValue) {
		try {
			await pluginsSettingsApi.updatePluginsSettings(rootStore.restApiContext, {
				mergeDevEnabled: false,
			});
			mergeDevEnabled.value = false;
			showToast({
				type: 'success',
				message: '',
				title: i18n.baseText('settings.plugins.mergeDev.success.disabled'),
			});
		} catch (error) {
			mergeDevEnabled.value = true;
			showError(error, i18n.baseText('settings.plugins.mergeDev.title'));
		}
	} else if (apiKeyDraft.value.trim()) {
		try {
			await pluginsSettingsApi.updatePluginsSettings(rootStore.restApiContext, {
				mergeDevEnabled: true,
			});
			mergeDevEnabled.value = true;
		} catch (error) {
			showError(error, i18n.baseText('settings.plugins.mergeDev.title'));
		}
	} else {
		mergeDevEnabled.value = true;
	}
}

async function saveMergeDevSettings() {
	if (!apiKeyDraft.value.trim()) {
		apiKeyError.value = i18n.baseText('settings.plugins.mergeDev.apiKey.required');
		return;
	}
	apiKeyError.value = '';
	isSaving.value = true;
	try {
		await pluginsSettingsApi.updatePluginsSettings(rootStore.restApiContext, {
			mergeDevEnabled: true,
			mergeDevApiKey: apiKeyDraft.value,
		});
		showToast({
			type: 'success',
			message: '',
			title: i18n.baseText('settings.plugins.mergeDev.success.saved'),
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.plugins.mergeDev.title'));
	} finally {
		isSaving.value = false;
	}
}
</script>

<template>
	<div class="pb-3xl">
		<div class="mb-xl" :class="$style.headerTitle">
			<N8nHeading tag="h1" size="2xlarge">
				{{ i18n.baseText('settings.plugins') }}
			</N8nHeading>
			<N8nText color="text-base" size="medium">
				{{ i18n.baseText('settings.plugins.description') }}
			</N8nText>
		</div>

		<div :class="$style.settingsSection">
			<div :class="$style.settingsContainer">
				<div :class="$style.settingsContainerInfo">
					<N8nText :bold="true">
						{{ i18n.baseText('settings.plugins.mergeDev.toggle') }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.plugins.mergeDev.description') }}
					</N8nText>
				</div>
				<div :class="$style.settingsContainerAction">
					<ElSwitch
						:model-value="mergeDevEnabled"
						:loading="isLoading"
						size="large"
						data-test-id="enable-merge-dev-toggle"
						@update:model-value="onMergeDevEnabledChange"
					/>
				</div>
			</div>

			<div v-if="mergeDevEnabled" :class="$style.apiKeySection">
				<N8nInputLabel
					:label="i18n.baseText('settings.plugins.mergeDev.apiKey.label')"
					color="text-dark"
				>
					<div :class="$style.apiKeyRow">
						<N8nInput
							v-model="apiKeyDraft"
							type="password"
							size="large"
							:placeholder="i18n.baseText('settings.plugins.mergeDev.apiKey.placeholder')"
							data-test-id="merge-dev-api-key-input"
							@input="apiKeyError = ''"
						/>
						<N8nButton
							type="primary"
							size="large"
							:loading="isSaving"
							data-test-id="merge-dev-save-btn"
							@click="saveMergeDevSettings"
						>
							{{ i18n.baseText('generic.save') }}
						</N8nButton>
					</div>
					<N8nText v-if="apiKeyError" size="small" color="danger" class="mt-4xs">
						{{ apiKeyError }}
					</N8nText>
				</N8nInputLabel>
			</div>
		</div>
	</div>
</template>

<style module>
.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.settingsSection {
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	margin-bottom: var(--spacing--lg);
}

.settingsContainer {
	display: flex;
	align-items: center;
	padding-left: var(--spacing--sm);
	justify-content: space-between;
	flex-shrink: 0;
}

.settingsContainerInfo {
	display: flex;
	padding: var(--spacing--2xs) 0;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.settingsContainerAction {
	display: flex;
	padding: var(--spacing--md) var(--spacing--sm);
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}

.apiKeySection {
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	padding: var(--spacing--sm);
}

.apiKeyRow {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}
</style>
