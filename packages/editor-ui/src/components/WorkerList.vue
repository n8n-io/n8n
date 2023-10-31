<template>
	<div :class="$style.execListWrapper">
		<div :class="$style.execList">
			<div :class="$style.execListHeader">
				<n8n-heading tag="h1" size="2xlarge">{{ this.pageTitle }}</n8n-heading>
			</div>
			<PushConnectionTracker class="actions"></PushConnectionTracker>
			<div v-if="isMounting">
				<n8n-loading :class="$style.tableLoader" variant="custom" />
			</div>
			<div v-else>
				<div v-for="workerId in workerIds" :key="workerId" :class="$style.card">
					<WorkerCard :workerId="workerId" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { externalHooks } from '@/mixins/externalHooks';
import PushConnectionTracker from '@/components/PushConnectionTracker.vue';
import { genericHelpers } from '@/mixins/genericHelpers';
import { executionHelpers } from '@/mixins/executionsHelpers';
import { useI18n } from '@/composables';
import type { IPushDataWorkerStatusPayload } from '@/Interface';
import type { ExecutionStatus } from 'n8n-workflow';
import { useUIStore } from '@/stores/ui.store';
import { useOrchestrationStore } from '../stores/orchestration.store';
import { setPageTitle } from '@/utils';
import { pushConnection } from '../mixins/pushConnection';
import WorkerCard from './WorkerCard.vue';

// eslint-disable-next-line import/no-default-export
export default defineComponent({
	name: 'WorkerList',
	mixins: [pushConnection, externalHooks, genericHelpers, executionHelpers],
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/naming-convention
	components: { PushConnectionTracker, WorkerCard },
	props: {
		autoRefreshEnabled: {
			type: Boolean,
			default: true,
		},
	},
	setup() {
		const i18n = useI18n();
		return {
			i18n,
		};
	},
	data() {
		return {
			isMounting: true,
		};
	},
	mounted() {
		setPageTitle(`n8n - ${this.pageTitle}`);
		this.isMounting = false;
	},
	beforeMount() {
		this.pushConnect();
		this.orchestrationManagerStore.startWorkerStatusPolling();
	},
	beforeUnmount() {
		this.orchestrationManagerStore.stopWorkerStatusPolling();
		this.pushDisconnect();
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
.execListWrapper {
	display: grid;
	grid-template-rows: 1fr 0;
	position: relative;
	height: 100%;
	width: 100%;
	max-width: 1280px;
}

.execList {
	position: relative;
	height: 100%;
	overflow: auto;
	padding: var(--spacing-l) var(--spacing-l) 0;
	@media (min-width: 1200px) {
		padding: var(--spacing-2xl) var(--spacing-2xl) 0;
	}
}

.execListHeader {
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
