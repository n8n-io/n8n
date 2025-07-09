<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useI18n } from '@n8n/i18n';
import { useOrchestrationStore } from '@/stores/orchestration.store';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { usePushConnection } from '@/composables/usePushConnection';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTelemetry } from '@/composables/useTelemetry';
import WorkerCard from './Workers/WorkerCard.ee.vue';

withDefaults(
	defineProps<{
		autoRefreshEnabled?: boolean;
	}>(),
	{
		autoRefreshEnabled: true,
	},
);

const router = useRouter();
const i18n = useI18n();
const pushConnection = usePushConnection({ router });
const documentTitle = useDocumentTitle();
const telemetry = useTelemetry();

const orchestrationManagerStore = useOrchestrationStore();
const rootStore = useRootStore();
const pushStore = usePushConnectionStore();

const initialStatusReceived = computed(() => orchestrationManagerStore.initialStatusReceived);

const workerIds = computed(() => Object.keys(orchestrationManagerStore.workers));

const pageTitle = computed(() => i18n.baseText('workerList.pageTitle'));

onMounted(() => {
	documentTitle.set(pageTitle.value);

	telemetry.track('User viewed worker view', {
		instance_id: rootStore.instanceId,
	});
});

onBeforeMount(() => {
	if (window.Cypress !== undefined) {
		return;
	}

	pushConnection.initialize();
	pushStore.pushConnect();
	orchestrationManagerStore.startWorkerStatusPolling();
});

onBeforeUnmount(() => {
	if (window.Cypress !== undefined) {
		return;
	}

	orchestrationManagerStore.stopWorkerStatusPolling();
	pushStore.pushDisconnect();
	pushConnection.terminate();
});
</script>

<template>
	<div>
		<PushConnectionTracker class="actions"></PushConnectionTracker>
		<div :class="$style.workerListHeader">
			<n8n-heading tag="h1" size="2xlarge">{{ pageTitle }}</n8n-heading>
		</div>
		<div v-if="!initialStatusReceived">
			<n8n-spinner />
		</div>
		<div v-else>
			<div v-if="workerIds.length === 0">{{ i18n.baseText('workerList.empty') }}</div>
			<div v-else>
				<div v-for="workerId in workerIds" :key="workerId" :class="$style.card">
					<WorkerCard :worker-id="workerId" data-test-id="worker-card" />
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.workerListHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing-s);
}

.card {
	margin-bottom: var(--spacing-s);
}

.tableLoader {
	width: 100%;
	height: 48px;
	margin-bottom: var(--spacing-2xs);
}
</style>
