<template>
	<div :class="$style.workerListWrapper">
		<div :class="$style.workerList">
			<WorkerList
				v-if="settingsStore.isQueueModeEnabled && settingsStore.isWorkerViewAvailable"
				data-test-id="worker-view-licensed"
			/>
			<n8n-action-box
				v-else
				data-test-id="worker-view-unlicensed"
				:class="$style.actionBox"
				:description="$locale.baseText('workerList.actionBox.description')"
				:buttonText="$locale.baseText('workerList.actionBox.buttonText')"
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
		</div>
	</div>
</template>

<script setup lang="ts">
import WorkerList from '@/components/WorkerList.ee.vue';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';

const settingsStore = useSettingsStore();
const uiStore = useUIStore();

const goToUpgrade = () => {
	void uiStore.goToUpgrade('source-control', 'upgrade-source-control');
};
</script>

<style module lang="scss">
.workerListWrapper {
	display: grid;
	grid-template-rows: 1fr 0;
	position: relative;
	height: 100%;
	width: 100%;
	max-width: 1280px;
}

.workerList {
	position: relative;
	height: 100%;
	overflow: auto;
	padding: var(--spacing-l) var(--spacing-l) 0;
	@media (min-width: 1200px) {
		padding: var(--spacing-2xl) var(--spacing-2xl) 0;
	}
}

.actionBox {
	margin: var(--spacing-2xl) 0 0;
}
</style>
