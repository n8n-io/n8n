<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

import { useSettingsStore } from '@/app/stores/settings.store';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useRBACStore } from '@/app/stores/rbac.store';
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
	N8nIcon,
	N8nInput,
	N8nTabs,
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
const rbacStore = useRBACStore();

const { showError, showMessage } = useToast();
const documentTitle = useDocumentTitle();
const i18n = useI18n();
const { goToUpgrade } = usePageRedirectionHelper();
const telemetry = useTelemetry();

const loading = ref(false);
const apiKeysStore = useApiKeysStore();
const { getAndCacheApiKeys, deleteApiKey, getApiKeyAvailableScopes } = apiKeysStore;
const { apiKeysSortByCreationDate } = storeToRefs(apiKeysStore);
const { isSwaggerUIEnabled, publicApiPath, publicApiLatestVersion } = settingsStore;
const { baseUrl } = useRootStore();

const { isPublicApiEnabled } = settingsStore;

const apiDocsURL = ref('');

const scopesModalApiKey = ref<ApiKey | null>(null);
const revokeApiKey = ref<ApiKey | null>(null);
const revoking = ref(false);

const canManageAllKeys = computed(() => rbacStore.hasScope('apiKey:manage'));

const currentTab = ref<'mine' | 'all'>('mine');
const searchQuery = ref('');

const ownApiKeys = computed(() =>
	apiKeysSortByCreationDate.value.filter(
		(key) => !key.owner || key.owner.id === usersStore.currentUser?.id,
	),
);

const otherUsersApiKeys = computed(() =>
	apiKeysSortByCreationDate.value.filter(
		(key) => !!key.owner && key.owner.id !== usersStore.currentUser?.id,
	),
);

function matchesQuery(apiKey: ApiKey, query: string): boolean {
	if (!query) return true;
	const needle = query.trim().toLowerCase();
	const haystacks = [
		apiKey.label,
		apiKey.owner?.email,
		apiKey.owner?.firstName,
		apiKey.owner?.lastName,
	].filter(Boolean) as string[];
	return haystacks.some((value) => value.toLowerCase().includes(needle));
}

const visibleApiKeys = computed(() => {
	const base = !canManageAllKeys.value
		? ownApiKeys.value
		: currentTab.value === 'all'
			? otherUsersApiKeys.value
			: ownApiKeys.value;
	return base.filter((key) => matchesQuery(key, searchQuery.value));
});

const tabOptions = computed(() => [
	{
		label: `${i18n.baseText('settings.api.tabs.mine')} (${ownApiKeys.value.length})`,
		value: 'mine' as const,
	},
	{
		label: `${i18n.baseText('settings.api.tabs.all')} (${otherUsersApiKeys.value.length})`,
		value: 'all' as const,
	},
]);

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
		await Promise.all([getAndCacheApiKeys(), getApiKeyAvailableScopes()]);
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
		<div :class="$style.heading">
			<N8nHeading size="2xlarge">
				{{ i18n.baseText('settings.api') }}
			</N8nHeading>
		</div>

		<p v-if="isPublicApiEnabled" :class="$style.description">
			<I18nT keypath="settings.api.view.info" tag="span" scope="global">
				<template #apiAction>
					<a
						data-test-id="api-playground-link"
						:class="$style.docLink"
						:href="apiDocsURL"
						target="_blank"
						v-text="i18n.baseText('settings.api.view.info.api')"
					/>
				</template>
				<template #webhookAction>
					<a
						data-test-id="webhook-docs-link"
						:class="$style.docLink"
						href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
						target="_blank"
						v-text="i18n.baseText('settings.api.view.info.webhook')"
					/>
				</template>
				<template #documentationAction>
					<a
						data-test-id="api-docs-link"
						:class="$style.docLink"
						href="https://docs.n8n.io/api"
						target="_blank"
						v-text="i18n.baseText('settings.api.view.info.documentation')"
					/>
				</template>
			</I18nT>
		</p>

		<N8nTabs
			v-if="isPublicApiEnabled && canManageAllKeys && apiKeysSortByCreationDate.length"
			v-model="currentTab"
			:options="tabOptions"
			data-test-id="api-keys-tabs"
			:class="$style.tabs"
		/>

		<div v-if="isPublicApiEnabled && apiKeysSortByCreationDate.length" :class="$style.toolbar">
			<N8nInput
				v-model="searchQuery"
				size="medium"
				:placeholder="i18n.baseText('settings.api.search.placeholder')"
				:class="$style.search"
				data-test-id="api-keys-search"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
			<N8nButton size="medium" @click="onCreateApiKey">
				{{ i18n.baseText('settings.api.create.button') }}
			</N8nButton>
		</div>

		<ApiKeyTable
			v-if="isPublicApiEnabled && visibleApiKeys.length"
			:api-keys="visibleApiKeys"
			:current-user-id="usersStore.currentUser?.id"
			:hide-owner="!canManageAllKeys || currentTab === 'mine'"
			@edit="onEdit"
			@revoke="onRevokeRequest"
			@open-scopes="onOpenScopes"
		/>

		<N8nText
			v-else-if="isPublicApiEnabled && apiKeysSortByCreationDate.length && searchQuery"
			color="text-light"
			size="small"
			:class="$style.emptySearch"
		>
			{{ i18n.baseText('settings.api.search.empty') }}
		</N8nText>

		<N8nActionBox
			v-if="!isPublicApiEnabled && cloudPlanStore.userIsTrialing"
			data-test-id="public-api-upgrade-cta"
			:heading="i18n.baseText('settings.api.trial.upgradePlan.title')"
			:description="i18n.baseText('settings.api.trial.upgradePlan.description')"
			:button-text="i18n.baseText('settings.api.trial.upgradePlan.cta')"
			@click:button="onUpgrade"
		/>

		<N8nActionBox
			v-if="isPublicApiEnabled && !apiKeysSortByCreationDate.length"
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
.heading {
	margin-bottom: var(--spacing--2xs);
}

.description {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
	margin: 0 0 var(--spacing--lg);
}

.docLink {
	color: var(--color--text);
	text-decoration: underline;

	&::after {
		content: '↗';
		margin-left: 2px;
	}
}

.container {
	display: flex;
	flex-direction: column;
}

.tabs {
	margin-bottom: var(--spacing--sm);
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--sm);
}

.search {
	flex: 0 1 360px;
	margin-right: auto;
}

.emptySearch {
	padding: var(--spacing--sm) 0;
}
</style>
