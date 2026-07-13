<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';

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
import type { IUser } from '@n8n/design-system';
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
import ApiKeyOwnerFilter from '../components/ApiKeyOwnerFilter.vue';

import ApiKeyTable from '../components/ApiKeyTable.vue';
import ApiKeyScopesModal from '../components/ApiKeyScopesModal.vue';
import RevokeApiKeyConfirmModal from '../components/RevokeApiKeyConfirmModal.vue';
import RotateApiKeyConfirmModal from '../components/RotateApiKeyConfirmModal.vue';

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
const {
	fetchApiKeys,
	setOwnership,
	setLabelFilter,
	setOwnerFilter,
	applyTableOptions,
	deleteApiKey,
	rotateApiKey,
	getApiKeyAvailableScopes,
} = apiKeysStore;
const {
	apiKeys,
	apiKeysCount,
	totalCountForOwnership,
	ownership,
	labelFilter,
	ownerIds,
	owners,
	totalMineCount,
	totalAllCount,
	hasAnyKeys,
	tableOptions,
} = storeToRefs(apiKeysStore);

const ownerOptions = computed<IUser[]>(() =>
	owners.value.map((owner) => ({
		id: owner.id,
		firstName: owner.firstName,
		lastName: owner.lastName,
		email: owner.email,
	})),
);

const ownerKeyCounts = computed<Record<string, number>>(() =>
	owners.value.reduce<Record<string, number>>((acc, owner) => {
		acc[owner.id] = owner.keyCount;
		return acc;
	}, {}),
);

// The store carries `null` for "all owners" (no narrowing); the picker is a
// plain multi-select, so present that as every owner being selected.
const selectedOwnerIds = computed(
	() => ownerIds.value ?? ownerOptions.value.map((owner) => owner.id),
);

async function onOwnerFilterChange(selected: string[]) {
	try {
		loading.value = true;
		await setOwnerFilter(selected);
	} catch (error) {
		showError(error, i18n.baseText('settings.api.view.error'));
	} finally {
		loading.value = false;
	}
}

const searchQuery = ref(labelFilter.value);

const onSearch = useDebounceFn(async (value: string) => {
	try {
		loading.value = true;
		await setLabelFilter(value.trim());
	} catch (error) {
		showError(error, i18n.baseText('settings.api.view.error'));
	} finally {
		loading.value = false;
	}
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

function onSearchInput(value: string) {
	searchQuery.value = value;
	void onSearch(value);
}
const { isSwaggerUIEnabled, publicApiPath, publicApiLatestVersion } = settingsStore;
const { baseUrl } = useRootStore();

const { isPublicApiEnabled } = settingsStore;

const apiDocsURL = computed(() => {
	if (!isSwaggerUIEnabled) return `https://${DOCS_DOMAIN}/api/api-reference/`;

	// Join with exactly one slash: baseUrl may or may not end in "/", and
	// publicApiPath may or may not start with "/" (its default is "api").
	const apiBase = `${baseUrl.replace(/\/+$/, '')}/${publicApiPath.replace(/^\/+/, '')}`;
	return `${apiBase}/v${publicApiLatestVersion}/docs`;
});

const scopesModalApiKey = ref<ApiKey | null>(null);
const revokeApiKey = ref<ApiKey | null>(null);
const revoking = ref(false);
const rotateConfirmApiKey = ref<ApiKey | null>(null);
const rotating = ref(false);

const canManageAllKeys = computed(() => rbacStore.hasScope('apiKey:manage'));

// Badges show the unfiltered totals so a search-narrowed "Mine (0)" doesn't read
// as "I have no keys" when the user really has keys that just don't match.
const tabOptions = computed(() => [
	{
		label: i18n.baseText('settings.api.tabs.mine'),
		value: 'mine' as const,
		tag: String(totalMineCount.value),
	},
	{
		label: i18n.baseText('settings.api.tabs.all'),
		value: 'all' as const,
		tag: String(totalAllCount.value),
	},
]);

async function onTabChange(newOwnership: 'mine' | 'all') {
	try {
		loading.value = true;
		await setOwnership(newOwnership);
		if (newOwnership === 'all') {
			telemetry.track('User viewed all API keys');
		}
	} catch (error) {
		showError(error, i18n.baseText('settings.api.view.error'));
	} finally {
		loading.value = false;
	}
}

async function onTableUpdate() {
	try {
		loading.value = true;
		await applyTableOptions();
	} catch (error) {
		showError(error, i18n.baseText('settings.api.view.error'));
	} finally {
		loading.value = false;
	}
}

const onCreateApiKey = () => {
	telemetry.track('User clicked create API key button');

	uiStore.openModalWithData({
		name: API_KEY_CREATE_OR_EDIT_MODAL_KEY,
		data: { mode: 'new' },
	});
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.api'));

	if (!isPublicApiEnabled) return;

	// Reset the Pinia store so a stale page/filter/sort from a prior visit can't
	// drive the first fetch into an empty page or wrong tab.
	apiKeysStore.$reset();
	searchQuery.value = '';
	await getApiKeysAndScopes();
});

onBeforeUnmount(() => {
	apiKeysStore.$reset();
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
		telemetry.track('User clicked delete API key button', {
			is_own: apiKey.owner?.id === usersStore.currentUser?.id,
		});
	}
}

function onRotateRequest(apiKey: ApiKey) {
	rotateConfirmApiKey.value = apiKey;
}

async function onRotateConfirm() {
	if (!rotateConfirmApiKey.value) return;
	const apiKey = rotateConfirmApiKey.value;
	rotating.value = true;
	try {
		const rotated = await rotateApiKey(apiKey.id);
		rotateConfirmApiKey.value = null;
		showMessage({ title: i18n.baseText('settings.api.rotate.toast'), type: 'success' });
		// Reuse the create modal's "created" view so a rotated key is presented identically.
		uiStore.openModalWithData({
			name: API_KEY_CREATE_OR_EDIT_MODAL_KEY,
			data: { mode: 'new', rotatedApiKey: rotated },
		});
		telemetry.track('User clicked rotate API key button', { is_own: true });
	} catch (e) {
		showError(e, i18n.baseText('settings.api.rotate.error'));
	} finally {
		rotating.value = false;
	}
}

function onOpenScopes(apiKey: ApiKey) {
	scopesModalApiKey.value = apiKey;
	telemetry.track('User clicked view API key scopes', {
		is_own: apiKey.owner?.id === usersStore.currentUser?.id,
	});
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.heading">
			<N8nHeading size="2xlarge">
				{{ i18n.baseText('settings.api') }}
			</N8nHeading>
		</div>

		<p v-if="isPublicApiEnabled && hasAnyKeys" :class="$style.description">
			<I18nT keypath="settings.api.view.info" tag="span" scope="global">
				<template #apiPlayground>
					<a
						:class="$style.docLink"
						data-test-id="api-playground-link"
						:href="apiDocsURL"
						target="_blank"
						v-text="i18n.baseText('settings.api.view.info.apiPlayground')"
					/>
				</template>
				<template #webhook>
					<a
						:class="$style.docLink"
						data-test-id="webhook-docs-link"
						href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
						target="_blank"
						v-text="i18n.baseText('settings.api.view.info.webhook')"
					/>
				</template>
				<template #documentation>
					<a
						:class="$style.docLink"
						data-test-id="api-docs-link"
						href="https://docs.n8n.io/api"
						target="_blank"
						v-text="i18n.baseText('settings.api.view.info.documentation')"
					/>
				</template>
			</I18nT>
		</p>

		<div v-if="isPublicApiEnabled && hasAnyKeys" :class="$style.toolbar">
			<div :class="$style.filters">
				<N8nInput
					:model-value="searchQuery"
					:placeholder="i18n.baseText('settings.api.search.placeholder')"
					:class="$style.search"
					size="medium"
					clearable
					data-test-id="api-keys-search"
					@update:model-value="onSearchInput"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<div v-if="canManageAllKeys && ownership === 'all'" :class="$style.ownerFilter">
					<ApiKeyOwnerFilter
						:model-value="selectedOwnerIds"
						:users="ownerOptions"
						:counts="ownerKeyCounts"
						:total-count="totalAllCount"
						:current-user-id="usersStore.currentUser?.id"
						data-test-id="api-keys-owner-filter"
						@update:model-value="onOwnerFilterChange"
					/>
				</div>
			</div>
			<N8nButton size="medium" @click="onCreateApiKey">
				{{ i18n.baseText('settings.api.create.button') }}
			</N8nButton>
		</div>

		<N8nTabs
			v-if="isPublicApiEnabled && canManageAllKeys && hasAnyKeys"
			:model-value="ownership"
			:options="tabOptions"
			data-test-id="api-keys-tabs"
			:class="$style.tabs"
			@update:model-value="onTabChange"
		/>

		<ApiKeyTable
			v-if="isPublicApiEnabled && hasAnyKeys && totalCountForOwnership > 0 && apiKeysCount > 0"
			v-model:table-options="tableOptions"
			:api-keys="apiKeys"
			:items-length="apiKeysCount"
			:loading="loading"
			:current-user-id="usersStore.currentUser?.id"
			:class="$style.table"
			@edit="onEdit"
			@revoke="onRevokeRequest"
			@rotate="onRotateRequest"
			@open-scopes="onOpenScopes"
			@update:options="onTableUpdate"
		/>

		<N8nText
			v-else-if="isPublicApiEnabled && hasAnyKeys && labelFilter.trim()"
			color="text-light"
			:class="$style.noResults"
			data-test-id="api-keys-no-results"
		>
			{{ i18n.baseText('settings.api.search.noResults') }}
		</N8nText>

		<N8nText
			v-else-if="isPublicApiEnabled && hasAnyKeys && ownership === 'mine'"
			color="text-light"
			:class="$style.noResults"
			data-test-id="api-keys-empty-mine"
		>
			{{ i18n.baseText('settings.api.empty.mine') }}
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
			v-if="isPublicApiEnabled && !hasAnyKeys"
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

		<RotateApiKeyConfirmModal
			:api-key="rotateConfirmApiKey"
			:open="!!rotateConfirmApiKey"
			:loading="rotating"
			@confirm="onRotateConfirm"
			@cancel="rotateConfirmApiKey = null"
			@update:open="rotateConfirmApiKey = null"
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

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

.filters {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex: 1 1 auto;
	min-width: 0;
}

.search {
	max-width: 320px;
	flex: 1 1 auto;
}

.ownerFilter {
	width: 240px;
	flex: 0 0 auto;
}

.container {
	display: flex;
	flex-direction: column;
}

.table {
	margin-bottom: var(--spacing--lg);
}

.noResults {
	display: block;
	padding: var(--spacing--lg) 0;
	text-align: center;
}

.tabs {
	margin-bottom: var(--spacing--sm);
}
</style>
