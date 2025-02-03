<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { useDocumentTitle } from '@/composables/useDocumentTitle';

import { useSettingsStore } from '@/stores/settings.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY, MODAL_CONFIRM } from '@/constants';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useUIStore } from '@/stores/ui.store';
import { useApiKeysStore } from '@/stores/apiKeys.store';
import { storeToRefs } from 'pinia';

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
const { getAndCacheApiKeys, deleteApiKey } = apiKeysStore;
const { apiKeysSortByCreationDate } = storeToRefs(apiKeysStore);

const { isPublicApiEnabled } = settingsStore;

const onCreateApiKey = async () => {
	telemetry.track('User clicked create API key button');

	uiStore.openModalWithData({
		name: API_KEY_CREATE_OR_EDIT_MODAL_KEY,
		data: { mode: 'new' },
	});
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.api'));

	if (!isPublicApiEnabled) return;

	await getApiKeys();
});

function onUpgrade() {
	void goToUpgrade('settings-n8n-api', 'upgrade-api', 'redirect');
}

async function getApiKeys() {
	try {
		loading.value = true;
		await getAndCacheApiKeys();
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
		<template v-if="apiKeysSortByCreationDate.length">
			<el-row
				v-for="apiKey in apiKeysSortByCreationDate"
				:key="apiKey.id"
				:gutter="10"
				:class="$style.destinationItem"
			>
				<el-col>
					<ApiKeyCard :api-key="apiKey" @delete="onDelete" @edit="onEdit" />
				</el-col>
			</el-row>

			<div class="mt-m text-right">
				<n8n-button
					size="large"
					:disabled="!apiKeysStore.canAddMoreApiKeys"
					@click="onCreateApiKey"
				>
					{{ i18n.baseText('settings.api.create.button') }}
				</n8n-button>
			</div>
		</template>

		<n8n-action-box
			v-else-if="!isPublicApiEnabled && cloudPlanStore.userIsTrialing"
			data-test-id="public-api-upgrade-cta"
			:heading="i18n.baseText('settings.api.trial.upgradePlan.title')"
			:description="i18n.baseText('settings.api.trial.upgradePlan.description')"
			:button-text="i18n.baseText('settings.api.trial.upgradePlan.cta')"
			@click:button="onUpgrade"
		/>
		<n8n-action-box
			v-if="isPublicApiEnabled && !apiKeysSortByCreationDate.length"
			:button-text="
				i18n.baseText(loading ? 'settings.api.create.button.loading' : 'settings.api.create.button')
			"
			:description="i18n.baseText('settings.api.create.description')"
			@click:button="onCreateApiKey"
		/>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	white-space: nowrap;
	margin-bottom: var(--spacing-2xl);

	*:first-child {
		flex-grow: 1;
	}
}

.card {
	position: relative;
}

.destinationItem {
	margin-bottom: var(--spacing-2xs);
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
