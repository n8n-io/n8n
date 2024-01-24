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
			<div v-if="workerIds.length === 0">{{ $locale.baseText('workerList.empty') }}</div>
			<div v-else>
				<div v-for="workerId in workerIds" :key="workerId" :class="$style.card">
					<WorkerCard :worker-id="workerId" data-test-id="worker-card" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import PushConnectionTracker from '@/components/PushConnectionTracker.vue';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import type { IPushDataWorkerStatusPayload } from '@/Interface';
import type { ExecutionStatus } from 'n8n-workflow';
import { useUIStore } from '@/stores/ui.store';
import { useOrchestrationStore } from '@/stores/orchestration.store';
import { setPageTitle } from '@/utils/htmlUtils';
import { pushConnection } from '@/mixins/pushConnection';
import WorkerCard from './Workers/WorkerCard.ee.vue';

// eslint-disable-next-line import/no-default-export
export default defineComponent({
	name: 'WorkerList',
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/naming-convention
	components: { PushConnectionTracker, WorkerCard },
	mixins: [pushConnection],
	props: {
		autoRefreshEnabled: {
			type: Boolean,
			default: true,
		},
	},
	setup(props, ctx) {
		const i18n = useI18n();
		return {
			i18n,
			...useToast(),
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			...pushConnection.setup?.(props, ctx),
		};
	},
	mounted() {
		setPageTitle(`n8n - ${this.pageTitle}`);

		this.$telemetry.track('User viewed worker view', {
			instance_id: this.rootStore.instanceId,
		});
	},
	beforeMount() {
		if (window.Cypress !== undefined) {
			return;
		}
		this.pushStore.pushConnect();
		this.orchestrationManagerStore.startWorkerStatusPolling();
	},
	beforeUnmount() {
		if (window.Cypress !== undefined) {
			return;
		}
		this.orchestrationManagerStore.stopWorkerStatusPolling();
		this.pushStore.pushDisconnect();
	},
	computed: {
		...mapStores(useUIStore, useOrchestrationStore),
		combinedWorkers(): IPushDataWorkerStatusPayload[] {
			const returnData: IPushDataWorkerStatusPayload[] = [];
			for (const workerId in this.orchestrationManagerStore.workers) {
				returnData.push(this.orchestrationManagerStore.workers[workerId]);
			}
			return returnData;
		},
		initialStatusReceived(): boolean {
			return this.orchestrationManagerStore.initialStatusReceived;
		},
		workerIds(): string[] {
			return Object.keys(this.orchestrationManagerStore.workers);
		},
		pageTitle() {
			return this.i18n.baseText('workerList.pageTitle');
		},
	},
	methods: {
		averageLoadAvg(loads: number[]) {
			return (loads.reduce((prev, curr) => prev + curr, 0) / loads.length).toFixed(2);
		},
		getStatus(payload: IPushDataWorkerStatusPayload): ExecutionStatus {
			if (payload.runningJobsSummary.length > 0) {
				return 'running';
			} else {
				return 'success';
			}
		},
		getRowClass(payload: IPushDataWorkerStatusPayload): string {
			return [this.$style.execRow, this.$style[this.getStatus(payload)]].join(' ');
		},
	},
});
</script>

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
