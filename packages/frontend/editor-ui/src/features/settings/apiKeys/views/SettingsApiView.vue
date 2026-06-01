<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

import { useSettingsStore } from '@/app/stores/settings.store';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { DOCS_DOMAIN } from '@/app/constants';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY } from '../apiKeys.constants';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useUIStore } from '@/app/stores/ui.store';
import { useApiKeysStore } from '../apiKeys.store';
import { storeToRefs } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ApiKey } from '@n8n/api-types';

import {
	N8nActionBox,
	N8nButton,
	N8nHeading,
	N8nLink,
	N8nPagination,
	N8nText,
} from '@n8n/design-system';
import { I18nT } from 'vue-i18n';

import ApiKeyTable from '../components/ApiKeyTable.vue';
import ApiKeyScopesModal from '../components/ApiKeyScopesModal.vue';
import RevokeApiKeyConfirmModal from '../components/RevokeApiKeyConfirmModal.vue';

const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const cloudPlanStore = useCloudPlanStore();
const usersStore = useUsersStore();

const { showError, showMessage } = useToast();
const documentTitle = useDocumentTitle();
const i18n = useI18n();
const { goToUpgrade } = usePageRedirectionHelper();
const telemetry = useTelemetry();

const loading = ref(false);
const apiKeysStore = useApiKeysStore();
const { fetchApiKeys, setPage, deleteApiKey, getApiKeyAvailableScopes } = apiKeysStore;
const { apiKeys, apiKeysCount, page, pageSize } = storeToRefs(apiKeysStore);
const { isSwaggerUIEnabled, publicApiPath, publicApiLatestVersion } = settingsStore;
const { baseUrl } = useRootStore();

const { isPublicApiEnabled } = settingsStore;

const apiDocsURL = ref('');

const scopesModalApiKey = ref<ApiKey | null>(null);
const revokeApiKey = ref<ApiKey | null>(null);
const revoking = ref(false);

const onCreateApiKey = () => {
	telemetry.track('User clicked create API key button');

	uiStore.openModalWithData({
		name: API_KEY_CREATE_OR_EDIT_MODAL_KEY,
		data: { mode: 'new' },
	});
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.api'));

	apiDocsURL.value = isSwaggerUIEnabled
		? `${baseUrl}${publicApiPath}/v${publicApiLatestVersion}/docs`
		: `https://${DOCS_DOMAIN}/api/api-reference/`;

	if (!isPublicApiEnabled) return;

	await getApiKeysAndScopes();
});

function onUpgrade() {
	void goToUpgrade('settings-n8n-api', 'upgrade-api', 'redirect');
}

async function getApiKeysAndScopes() {
	try {
		loading.value = true;
		await Promise.all([fetchApiKeys(), getApiKeyAvailableScopes()]);
	} catch (error) {
		showError(error, i18n.baseText('settings.api.view.error'));
	} finally {
		loading.value = false;
	}
}

async function onPageChange(newPage: number) {
	try {
		loading.value = true;
		await setPage(newPage);
	} catch (error) {
		showError(error, i18n.baseText('settings.api.view.error'));
	} finally {
		loading.value = false;
	}
}

function onEdit(apiKey: ApiKey) {
	uiStore.openModalWithData({
		name: API_KEY_CREATE_OR_EDIT_MODAL_KEY,
		data: { mode: 'edit', activeId: apiKey.id },
	});
}

function onRevokeRequest(apiKey: ApiKey) {
	revokeApiKey.value = apiKey;
}

async function onRevokeConfirm() {
	if (!revokeApiKey.value) return;
	const apiKey = revokeApiKey.value;
	revoking.value = true;
	try {
		await deleteApiKey(apiKey.id);
		showMessage({ title: i18n.baseText('settings.api.revoke.toast'), type: 'success' });
		revokeApiKey.value = null;
	} catch (e) {
		showError(e, i18n.baseText('settings.api.delete.error'));
	} finally {
		revoking.value = false;
		telemetry.track('User clicked delete API key button');
	}
}

function onOpenScopes(apiKey: ApiKey) {
	scopesModalApiKey.value = apiKey;
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">
				{{ i18n.baseText('settings.api') }}
			</N8nHeading>
			<N8nButton v-if="isPublicApiEnabled && apiKeys.length" size="large" @click="onCreateApiKey">
				{{ i18n.baseText('settings.api.create.button') }}
			</N8nButton>
		</div>

		<p v-if="isPublicApiEnabled && apiKeys.length" :class="$style.topHint">
			<N8nText>
				<I18nT keypath="settings.api.view.info" tag="span" scope="global">
					<template #apiAction>
						<a
							data-test-id="api-docs-link"
							href="https://docs.n8n.io/api"
							target="_blank"
							v-text="i18n.baseText('settings.api.view.info.api')"
						/>
					</template>
					<template #webhookAction>
						<a
							data-test-id="webhook-docs-link"
							href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
							target="_blank"
							v-text="i18n.baseText('settings.api.view.info.webhook')"
						/>
					</template>
				</I18nT>
			</N8nText>
		</p>

		<ApiKeyTable
			v-if="isPublicApiEnabled && apiKeys.length"
			:api-keys="apiKeys"
			:current-user-id="usersStore.currentUser?.id"
			@edit="onEdit"
			@revoke="onRevokeRequest"
			@open-scopes="onOpenScopes"
		/>

		<div v-if="isPublicApiEnabled && apiKeys.length" :class="$style.footer">
			<div :class="$style.bottomHint">
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText(
							`settings.api.view.${settingsStore.isSwaggerUIEnabled ? 'tryapi' : 'more-details'}`,
						)
					}}
				</N8nText>
				{{ ' ' }}
				<N8nLink
					v-if="isSwaggerUIEnabled"
					data-test-id="api-playground-link"
					:to="apiDocsURL"
					:new-window="true"
					size="small"
				>
					{{ i18n.baseText('settings.api.view.apiPlayground') }}
				</N8nLink>
				<N8nLink
					v-else
					data-test-id="api-endpoint-docs-link"
					:to="apiDocsURL"
					:new-window="true"
					size="small"
				>
					{{ i18n.baseText(`settings.api.view.external-docs`) }}
				</N8nLink>
			</div>

			<N8nPagination
				v-if="apiKeysCount > pageSize"
				:current-page="page"
				:page-size="pageSize"
				:total="apiKeysCount"
				layout="total, prev, pager, next"
				data-test-id="api-keys-pagination"
				@current-change="onPageChange"
			/>
		</div>

		<N8nActionBox
			v-if="!isPublicApiEnabled && cloudPlanStore.userIsTrialing"
			data-test-id="public-api-upgrade-cta"
			:heading="i18n.baseText('settings.api.trial.upgradePlan.title')"
			:description="i18n.baseText('settings.api.trial.upgradePlan.description')"
			:button-text="i18n.baseText('settings.api.trial.upgradePlan.cta')"
			@click:button="onUpgrade"
		/>

		<N8nActionBox
			v-if="isPublicApiEnabled && !apiKeys.length"
			:button-text="
				i18n.baseText(loading ? 'settings.api.create.button.loading' : 'settings.api.create.button')
			"
			:description="i18n.baseText('settings.api.create.description')"
			@click:button="onCreateApiKey"
		/>

		<ApiKeyScopesModal
			:api-key="scopesModalApiKey"
			:open="!!scopesModalApiKey"
			@update:open="scopesModalApiKey = null"
		/>

		<RevokeApiKeyConfirmModal
			:api-key="revokeApiKey"
			:open="!!revokeApiKey"
			:loading="revoking"
			:revoking-for-other="
				!!revokeApiKey?.owner && revokeApiKey.owner.id !== usersStore.currentUser?.id
			"
			@confirm="onRevokeConfirm"
			@cancel="revokeApiKey = null"
			@update:open="revokeApiKey = null"
		/>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	white-space: nowrap;
	margin-bottom: var(--spacing--xl);
	gap: var(--spacing--sm);
}

.topHint {
	margin-top: 0;
	margin-bottom: var(--spacing--sm);
	color: var(--color--text--tint-1);

	span {
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
		font-weight: var(--font-weight--regular);
	}
}

.container {
	display: flex;
	flex-direction: column;
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-top: var(--spacing--sm);
}

.bottomHint {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--5xs);
}
</style>
