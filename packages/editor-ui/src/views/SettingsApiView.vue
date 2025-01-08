<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import type { ApiKey } from '@/Interface';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { useDocumentTitle } from '@/composables/useDocumentTitle';

import CopyInput from '@/components/CopyInput.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@/stores/root.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { DOCS_DOMAIN, MODAL_CONFIRM } from '@/constants';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

const settingsStore = useSettingsStore();
const cloudPlanStore = useCloudPlanStore();
const { baseUrl } = useRootStore();

const { showError, showMessage } = useToast();
const { confirm } = useMessage();
const documentTitle = useDocumentTitle();
const i18n = useI18n();
const { goToUpgrade } = usePageRedirectionHelper();
const telemetry = useTelemetry();

const loading = ref(false);
const mounted = ref(false);
const apiKeys = ref<ApiKey[]>([]);
const apiDocsURL = ref('');

const { isPublicApiEnabled, isSwaggerUIEnabled, publicApiPath, publicApiLatestVersion } =
	settingsStore;

const isRedactedApiKey = computed((): boolean => {
	if (!apiKeys.value) return false;
	return apiKeys.value[0].apiKey.includes('*');
});

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.api'));
	if (!isPublicApiEnabled) return;

	void getApiKeys();
	apiDocsURL.value = isSwaggerUIEnabled
		? `${baseUrl}${publicApiPath}/v${publicApiLatestVersion}/docs`
		: `https://${DOCS_DOMAIN}/api/api-reference/`;
});

function onUpgrade() {
	void goToUpgrade('settings-n8n-api', 'upgrade-api', 'redirect');
}

async function showDeleteModal() {
	const confirmed = await confirm(
		i18n.baseText('settings.api.delete.description'),
		i18n.baseText('settings.api.delete.title'),
		{
			confirmButtonText: i18n.baseText('settings.api.delete.button'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (confirmed === MODAL_CONFIRM) {
		await deleteApiKey();
	}
}

async function getApiKeys() {
	try {
		apiKeys.value = await settingsStore.getApiKeys();
	} catch (error) {
		showError(error, i18n.baseText('settings.api.view.error'));
	} finally {
		mounted.value = true;
	}
}

async function createApiKey() {
	loading.value = true;

	try {
		const newApiKey = await settingsStore.createApiKey();
		apiKeys.value.push(newApiKey);
	} catch (error) {
		showError(error, i18n.baseText('settings.api.create.error'));
	} finally {
		loading.value = false;
		telemetry.track('User clicked create API key button');
	}
}

async function deleteApiKey() {
	try {
		await settingsStore.deleteApiKey(apiKeys.value[0].id);
		showMessage({
			title: i18n.baseText('settings.api.delete.toast'),
			type: 'success',
		});
		apiKeys.value = [];
	} catch (error) {
		showError(error, i18n.baseText('settings.api.delete.error'));
	} finally {
		telemetry.track('User clicked delete API key button');
	}
}

function onCopy() {
	telemetry.track('User clicked copy API key button');
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading size="2xlarge">
				{{ i18n.baseText('settings.api') }}
				<span :style="{ fontSize: 'var(--font-size-s)', color: 'var(--color-text-light)' }">
					({{ i18n.baseText('generic.beta') }})
				</span>
			</n8n-heading>
		</div>

		<div v-if="apiKeys.length">
			<p class="mb-s">
				<n8n-info-tip :bold="false">
					<i18n-t keypath="settings.api.view.info" tag="span">
						<template #apiAction>
							<a
								href="https://docs.n8n.io/api"
								target="_blank"
								v-text="i18n.baseText('settings.api.view.info.api')"
							/>
						</template>
						<template #webhookAction>
							<a
								href="https://docs.n8n.io/integrations/core-nodes/n8n-nodes-base.webhook/"
								target="_blank"
								v-text="i18n.baseText('settings.api.view.info.webhook')"
							/>
						</template>
					</i18n-t>
				</n8n-info-tip>
			</p>
			<n8n-card class="mb-4xs" :class="$style.card">
				<span :class="$style.delete">
					<n8n-link :bold="true" @click="showDeleteModal">
						{{ i18n.baseText('generic.delete') }}
					</n8n-link>
				</span>

				<div>
					<CopyInput
						:label="apiKeys[0].label"
						:value="apiKeys[0].apiKey"
						:copy-button-text="i18n.baseText('generic.clickToCopy')"
						:toast-title="i18n.baseText('settings.api.view.copy.toast')"
						:redact-value="true"
						:disable-copy="isRedactedApiKey"
						:hint="!isRedactedApiKey ? i18n.baseText('settings.api.view.copy') : ''"
						@copy="onCopy"
					/>
				</div>
			</n8n-card>
			<div :class="$style.hint">
				<n8n-text size="small">
					{{ i18n.baseText(`settings.api.view.${isSwaggerUIEnabled ? 'tryapi' : 'more-details'}`) }}
				</n8n-text>
				{{ ' ' }}
				<n8n-link :to="apiDocsURL" :new-window="true" size="small">
					{{
						i18n.baseText(
							`settings.api.view.${isSwaggerUIEnabled ? 'apiPlayground' : 'external-docs'}`,
						)
					}}
				</n8n-link>
			</div>
		</div>
		<n8n-action-box
			v-else-if="!isPublicApiEnabled && cloudPlanStore.userIsTrialing"
			data-test-id="public-api-upgrade-cta"
			:heading="i18n.baseText('settings.api.trial.upgradePlan.title')"
			:description="i18n.baseText('settings.api.trial.upgradePlan.description')"
			:button-text="i18n.baseText('settings.api.trial.upgradePlan.cta')"
			@click:button="onUpgrade"
		/>
		<n8n-action-box
			v-else-if="mounted && !cloudPlanStore.state.loadingPlan"
			:button-text="
				i18n.baseText(loading ? 'settings.api.create.button.loading' : 'settings.api.create.button')
			"
			:description="i18n.baseText('settings.api.create.description')"
			@click:button="createApiKey"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing-2xl);
	}
}

.header {
	display: flex;
	align-items: center;
	white-space: nowrap;

	*:first-child {
		flex-grow: 1;
	}
}

.card {
	position: relative;
}

.delete {
	position: absolute;
	display: inline-block;
	top: var(--spacing-s);
	right: var(--spacing-s);
}

.hint {
	color: var(--color-text-light);
}
</style>
