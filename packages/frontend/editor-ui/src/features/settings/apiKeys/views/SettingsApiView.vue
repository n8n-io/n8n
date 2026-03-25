<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

import { useSettingsStore } from '@/app/stores/settings.store';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { DOCS_DOMAIN, MODAL_CONFIRM } from '@/app/constants';
import {
	API_KEY_CREATE_OR_EDIT_MODAL_KEY,
	CLI_SESSION_DETAIL_MODAL_KEY,
} from '../apiKeys.constants';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useUIStore } from '@/app/stores/ui.store';
import { useApiKeysStore } from '../apiKeys.store';
import { storeToRefs } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';

import { ElCol, ElRow } from 'element-plus';
import { N8nActionBox, N8nButton, N8nHeading, N8nLink, N8nTabs, N8nText } from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { I18nT } from 'vue-i18n';
import ApiKeyCard from '../components/ApiKeyCard.vue';
import CliSessionCard from '../components/CliSessionCard.vue';
import CliSessionDetailModal from '../components/CliSessionDetailModal.vue';
import type { CliSessionResponseDto } from '@n8n/api-types';

type ApiSettingsTabs = 'apiKeys' | 'cliSessions';

const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const cloudPlanStore = useCloudPlanStore();

const { showError, showMessage } = useToast();
const { confirm } = useMessage();
const documentTitle = useDocumentTitle();
const i18n = useI18n();
const { goToUpgrade } = usePageRedirectionHelper();
const telemetry = useTelemetry();

const loading = ref(false);
const apiKeysStore = useApiKeysStore();
const { getAndCacheApiKeys, deleteApiKey, getApiKeyAvailableScopes } = apiKeysStore;
const { apiKeysSortByCreationDate, cliSessions } = storeToRefs(apiKeysStore);
const { isSwaggerUIEnabled, publicApiPath, publicApiLatestVersion } = settingsStore;
const { baseUrl } = useRootStore();

const { isPublicApiEnabled } = settingsStore;

const apiDocsURL = ref('');
const selectedTab = ref<ApiSettingsTabs>('apiKeys');
const cliSessionsLoading = ref(false);
const activeSession = ref<CliSessionResponseDto | null>(null);

const tabs = ref<Array<TabOptions<ApiSettingsTabs>>>([
	{
		label: i18n.baseText('settings.api.tabs.apiKeys'),
		value: 'apiKeys',
	},
	{
		label: i18n.baseText('settings.api.tabs.cliAccess'),
		value: 'cliSessions',
	},
]);

const onTabSelected = async (tab: ApiSettingsTabs) => {
	selectedTab.value = tab;
	if (tab === 'cliSessions' && cliSessions.value.length === 0) {
		await fetchCliSessions();
	}
};

const onCreateApiKey = async () => {
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

async function onDelete(id: string) {
	const confirmed = await confirm(
		i18n.baseText('settings.api.delete.description'),
		i18n.baseText('settings.api.delete.title'),
		{
			confirmButtonText: i18n.baseText('settings.api.delete.button'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);

	if (confirmed === MODAL_CONFIRM) {
		try {
			await deleteApiKey(id);
			showMessage({
				title: i18n.baseText('settings.api.delete.toast'),
				type: 'success',
			});
		} catch (e) {
			showError(e, i18n.baseText('settings.api.delete.error'));
		} finally {
			telemetry.track('User clicked delete API key button');
		}
	}
}

function onEdit(id: string) {
	uiStore.openModalWithData({
		name: API_KEY_CREATE_OR_EDIT_MODAL_KEY,
		data: { mode: 'edit', activeId: id },
	});
}

async function fetchCliSessions() {
	try {
		cliSessionsLoading.value = true;
		await apiKeysStore.fetchCliSessions();
	} catch (error) {
		showError(error, i18n.baseText('settings.api.cliAccess.error.fetching'));
	} finally {
		cliSessionsLoading.value = false;
	}
}

function viewCliSession(session: CliSessionResponseDto) {
	activeSession.value = session;
	uiStore.openModal(CLI_SESSION_DETAIL_MODAL_KEY);
}

async function revokeCliSession(session: CliSessionResponseDto) {
	try {
		await apiKeysStore.revokeCliSession(session.id);
		showMessage({
			type: 'success',
			title: i18n.baseText('settings.api.cliAccess.revoke.success.title'),
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.api.cliAccess.revoke.error'));
	}
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">
				{{ i18n.baseText('settings.api') }}
			</N8nHeading>
		</div>

		<N8nActionBox
			v-if="!isPublicApiEnabled && cloudPlanStore.userIsTrialing"
			data-test-id="public-api-upgrade-cta"
			:heading="i18n.baseText('settings.api.trial.upgradePlan.title')"
			:description="i18n.baseText('settings.api.trial.upgradePlan.description')"
			:button-text="i18n.baseText('settings.api.trial.upgradePlan.cta')"
			@click:button="onUpgrade"
		/>

		<template v-if="isPublicApiEnabled">
			<N8nTabs :model-value="selectedTab" :options="tabs" @update:model-value="onTabSelected" />

			<!-- API Keys Tab -->
			<div v-if="selectedTab === 'apiKeys'" class="mt-m">
				<p v-if="apiKeysSortByCreationDate.length" :class="$style.topHint">
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

				<div :class="$style.apiKeysContainer">
					<template v-if="apiKeysSortByCreationDate.length">
						<ElRow
							v-for="(apiKey, index) in apiKeysSortByCreationDate"
							:key="apiKey.id"
							:gutter="10"
							:class="[
								{ [$style.destinationItem]: index !== apiKeysSortByCreationDate.length - 1 },
							]"
						>
							<ElCol>
								<ApiKeyCard :api-key="apiKey" @delete="onDelete" @edit="onEdit" />
							</ElCol>
						</ElRow>
					</template>
				</div>

				<div v-if="apiKeysSortByCreationDate.length" :class="$style.BottomHint">
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
				<div class="mt-m text-right">
					<N8nButton v-if="apiKeysSortByCreationDate.length" size="large" @click="onCreateApiKey">
						{{ i18n.baseText('settings.api.create.button') }}
					</N8nButton>
				</div>

				<N8nActionBox
					v-if="!apiKeysSortByCreationDate.length"
					:button-text="
						i18n.baseText(
							loading ? 'settings.api.create.button.loading' : 'settings.api.create.button',
						)
					"
					:description="i18n.baseText('settings.api.create.description')"
					@click:button="onCreateApiKey"
				/>
			</div>

			<!-- CLI Sessions Tab -->
			<div v-if="selectedTab === 'cliSessions'" class="mt-m">
				<div :class="$style.apiKeysContainer">
					<template v-if="cliSessions.length">
						<ElRow
							v-for="(session, index) in cliSessions"
							:key="session.id"
							:gutter="10"
							:class="[{ [$style.destinationItem]: index !== cliSessions.length - 1 }]"
						>
							<ElCol>
								<CliSessionCard
									:session="session"
									@view="viewCliSession"
									@revoke="revokeCliSession"
								/>
							</ElCol>
						</ElRow>
					</template>
				</div>

				<N8nActionBox
					v-if="!cliSessionsLoading && !cliSessions.length"
					:description="i18n.baseText('settings.api.cliAccess.empty')"
				/>
			</div>
		</template>

		<CliSessionDetailModal
			v-if="activeSession"
			:session="activeSession"
			@revoke="revokeCliSession"
		/>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	white-space: nowrap;
	margin-bottom: var(--spacing--xl);

	*:first-child {
		flex-grow: 1;
	}
}

.card {
	position: relative;
}

.destinationItem {
	margin-bottom: var(--spacing--2xs);
}

.delete {
	position: absolute;
	display: inline-block;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
}

.topHint {
	margin-top: none;
	margin-bottom: var(--spacing--sm);
	color: var(--color--text--tint-1);

	span {
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
		font-weight: var(--font-weight--regular);
	}
}

.BottomHint {
	margin-bottom: var(--spacing--sm);
	margin-top: var(--spacing--sm);
}

.apiKeysContainer {
	max-height: 45vh;
	overflow-y: auto;
	overflow-x: hidden;
	scrollbar-width: none;
}
</style>
