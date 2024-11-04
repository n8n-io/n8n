<script setup lang="ts">
import WorkerList from '@/components/WorkerList.ee.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

const settingsStore = useSettingsStore();
const pageRedirectionHelper = usePageRedirectionHelper();

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('worker-view', 'upgrade-worker-view');
};
</script>

<template>
	<WorkerList
		v-if="settingsStore.isQueueModeEnabled && settingsStore.isWorkerViewAvailable"
		data-test-id="worker-view-licensed"
	/>
	<n8n-action-box
		v-else
		data-test-id="worker-view-unlicensed"
		:class="$style.actionBox"
		:description="$locale.baseText('workerList.actionBox.description')"
		:button-text="$locale.baseText('workerList.actionBox.buttonText')"
		@click:button="goToUpgrade"
	>
		<template #heading>
			<span>{{ $locale.baseText('workerList.actionBox.title') }}</span>
		</template>
		<template #description>
			{{ $locale.baseText('workerList.actionBox.description') }}
			<a :href="$locale.baseText('workerList.docs.url')" target="_blank">
				{{ $locale.baseText('workerList.actionBox.description.link') }}
			</a>
		</template>
	</n8n-action-box>
</template>

<style module lang="scss">
.actionBox {
	margin: var(--spacing-2xl) 0 0;
}
</style>
