<script setup lang="ts">
import { computed } from 'vue';
import WorkerList from '../components/WorkerList.vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useI18n } from '@n8n/i18n';

import { N8nEmptyState, N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';
const settingsStore = useSettingsStore();
const pageRedirectionHelper = usePageRedirectionHelper();
const i18n = useI18n();

const showWorkerList = computed(
	() => settingsStore.isQueueModeEnabled && settingsStore.isWorkerViewAvailable,
);

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('worker-view', 'upgrade-worker-view');
};
</script>

<template>
	<N8nSettingsLayout size="wide">
		<N8nSettingsPageHeader :title="i18n.baseText('workerList.pageTitle')" :show-docs-link="false" />
		<WorkerList v-if="showWorkerList" data-test-id="worker-view-licensed" />
		<N8nEmptyState
			v-else
			data-test-id="worker-view-unlicensed"
			:description="i18n.baseText('workerList.actionBox.description')"
			:button-text="i18n.baseText('workerList.actionBox.buttonText')"
			@click:button="goToUpgrade"
		>
			<template #heading>
				<span>{{ i18n.baseText('workerList.actionBox.title') }}</span>
			</template>
			<template #description>
				{{ i18n.baseText('workerList.actionBox.description') }}
				<a :href="i18n.baseText('workerList.docs.url')" target="_blank">
					{{ i18n.baseText('workerList.actionBox.description.link') }}
				</a>
			</template>
		</N8nEmptyState>
	</N8nSettingsLayout>
</template>
