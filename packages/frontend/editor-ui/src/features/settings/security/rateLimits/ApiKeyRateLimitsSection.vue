<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { I18nT } from 'vue-i18n';
import type {
	PublicApiRateLimitSettings,
	PublicApiRateLimitSettingsResponse,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nIcon,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nSwitch,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import * as rateLimitSettingsApi from '@n8n/rest-api-client/api/public-api-rate-limit-settings';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';

import ApiKeyRateLimitsDialog from './ApiKeyRateLimitsDialog.vue';
import { RATE_LIMIT_GROUP_KEYS, summarizeLimits } from './rateLimits';

const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const { showToast, showError } = useToast();

const isSaving = ref(false);
const dialogOpen = ref(false);
const dialogMode = ref<'enable' | 'edit'>('enable');

const { state } = useAsyncState(async () => {
	try {
		return await rateLimitSettingsApi.getPublicApiRateLimitSettings(rootStore.restApiContext);
	} catch (error) {
		showError(error, i18n.baseText('settings.security.rateLimits.error.load'));
		return undefined;
	}
}, undefined);

const settings = computed((): PublicApiRateLimitSettings | undefined => {
	if (!state.value) return undefined;
	const { defaults: _defaults, envManagedFields: _envManagedFields, ...values } = state.value;
	return values;
});

const areApiKeysDisabled = computed(() => !settingsStore.isPublicApiEnabled);
const isEnabledEnvManaged = computed(
	() => state.value?.envManagedFields.includes('enabled') ?? false,
);
const isToggleLocked = computed(() => areApiKeysDisabled.value || isEnabledEnvManaged.value);
const toggleLockedReason = computed(() =>
	areApiKeysDisabled.value
		? i18n.baseText('settings.security.rateLimits.apiKeysDisabled')
		: i18n.baseText('settings.security.rateLimits.envLocked.toggle'),
);

const toggleValue = computed({
	get: () => settings.value?.enabled ?? false,
	set: (value: boolean) => {
		if (!settings.value) return;
		if (value) {
			openDialog('enable');
			return;
		}
		void save({ ...settings.value, enabled: false });
	},
});

function openDialog(mode: 'enable' | 'edit') {
	dialogMode.value = mode;
	dialogOpen.value = true;
}

function successMessage(before: boolean, after: boolean) {
	if (before === after) return i18n.baseText('settings.security.rateLimits.success.saved');
	return after
		? i18n.baseText('settings.security.rateLimits.success.enabled')
		: i18n.baseText('settings.security.rateLimits.success.disabled');
}

async function save(next: PublicApiRateLimitSettings) {
	const wasEnabled = settings.value?.enabled ?? false;
	isSaving.value = true;
	try {
		const response: PublicApiRateLimitSettingsResponse =
			await rateLimitSettingsApi.updatePublicApiRateLimitSettings(rootStore.restApiContext, next);
		state.value = response;
		dialogOpen.value = false;
		showToast({
			type: 'success',
			title: successMessage(wasEnabled, response.enabled),
			message: '',
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.security.rateLimits.error.save'));
	} finally {
		isSaving.value = false;
	}
}
</script>

<template>
	<N8nSettingsSection
		v-if="state && settings"
		:title="i18n.baseText('settings.security.rateLimits.title')"
		data-test-id="rate-limits-section"
	>
		<N8nSettingsRowGroup>
			<N8nSettingsRow :model-value="settings.enabled" expandable :disclosure="false">
				<template #info>
					<N8nText :bold="true">
						{{ i18n.baseText('settings.security.rateLimits.enable.title') }}
					</N8nText>
					<N8nText size="small" color="text-light">
						<I18nT
							keypath="settings.security.rateLimits.enable.description"
							tag="span"
							scope="global"
						>
							<template #apiKeys>
								<RouterLink :to="{ name: VIEWS.API_SETTINGS }">
									{{ i18n.baseText('settings.security.rateLimits.enable.description.apiKeys') }}
								</RouterLink>
							</template>
						</I18nT>
					</N8nText>
				</template>
				<template #action>
					<N8nTooltip :disabled="!isToggleLocked" :content="toggleLockedReason">
						<N8nSwitch
							v-model="toggleValue"
							size="large"
							:aria-label="i18n.baseText('settings.security.rateLimits.enable.title')"
							:disabled="isToggleLocked || isSaving"
							data-test-id="rate-limits-toggle"
						/>
					</N8nTooltip>
				</template>
				<template #expanded>
					<div v-if="settings.enabled" :class="$style.summary">
						<div :class="$style.summaryLines">
							<div v-for="group in RATE_LIMIT_GROUP_KEYS" :key="group" :class="$style.summaryLine">
								<div :class="$style.summaryLabel">
									<N8nText size="small">
										{{ i18n.baseText(`settings.security.rateLimits.group.${group}`) }}
									</N8nText>
									<N8nTooltip
										:content="i18n.baseText(`settings.security.rateLimits.group.${group}.tooltip`)"
									>
										<N8nIcon icon="info" size="small" color="text-light" />
									</N8nTooltip>
								</div>
								<N8nText size="small" :data-test-id="`rate-limits-summary-${group}`">
									{{ summarizeLimits(settings, group, i18n) }}
								</N8nText>
							</div>
						</div>
						<N8nTooltip :content="i18n.baseText('settings.security.rateLimits.edit')">
							<N8nButton
								variant="ghost"
								size="small"
								icon-only
								:aria-label="i18n.baseText('settings.security.rateLimits.edit')"
								:disabled="areApiKeysDisabled"
								data-test-id="rate-limits-edit"
								@click="openDialog('edit')"
							>
								<N8nIcon icon="pencil" />
							</N8nButton>
						</N8nTooltip>
					</div>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>

		<ApiKeyRateLimitsDialog
			v-model:open="dialogOpen"
			:mode="dialogMode"
			:settings="settings"
			:defaults="state.defaults"
			:env-managed-fields="state.envManagedFields"
			:saving="isSaving"
			@save="save"
		/>
	</N8nSettingsSection>
</template>

<style lang="scss" module>
.summary {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
}

.summaryLines {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
}

.summaryLine {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.summaryLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
