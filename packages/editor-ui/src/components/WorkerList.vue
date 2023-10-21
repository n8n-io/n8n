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
			<table v-else :class="$style.execTable">
				<thead>
					<tr>
						<th>Id</th>
						<th>Jobs</th>
						<th>Load(avg)</th>
						<th>Mem(free)</th>
						<th>Mem(Total)</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="worker in combinedWorkers" :key="worker.workerId" :class="getRowClass(worker)">
						<td>
							<span
								><a href="#" :class="$style.link">{{ worker.workerId }}</a></span
							>
						</td>
						<td>
							<div
								v-for="job in worker.runningJobsSummary"
								:key="job.executionId"
								:class="$style.executionlink"
							>
								<a :href="'/workflow/' + job.workflowId + '/executions/' + job.executionId"
									>{{ job.workflowName }} ({{ job.executionId }})</a
								>
							</div>
						</td>
						<td>
							<span>{{ averageLoadAvg(worker.loadAvg) }}</span>
						</td>
						<td>
							<span>{{ (worker.freeMem / 1024 / 1024 / 1024).toFixed(2) }}GB</span>
						</td>
						<td>
							<span>{{ (worker.totalMem / 1024 / 1024 / 1024).toFixed(2) }}GB</span>
						</td>
					</tr>
				</tbody>
			</table>

			<div
				v-if="!combinedWorkers.length && !isMounting"
				:class="$style.loadedAll"
				data-test-id="worker-list-empty"
			>
				{{ i18n.baseText('workerList.empty') }}
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

// eslint-disable-next-line import/no-default-export
export default defineComponent({
	name: 'ExecutionsList',
	mixins: [pushConnection, externalHooks, genericHelpers, executionHelpers],
	components: { PushConnectionTracker },
	props: {
		autoRefreshEnabled: {
			type: Boolean,
			default: true,
		},
	},
	setup(props) {
		const i18n = useI18n();

		//ts-ignore
		const pushConnSetup = pushConnection.setup?.(props) ?? {};
		return {
			i18n,
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			...pushConnSetup,
		};
	},
	data() {
		return {
			isMounting: true,
		};
	},
	mounted() {
		setPageTitle(`n8n - ${this.pageTitle}`);
		this.pushConnect();
		this.orchestrationManagerStore.startWorkerStatusPolling();
		this.isMounting = false;
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

.execListHeaderControls {
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.status {
	line-height: 22.6px;
	text-align: center;
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);

	.crashed &,
	.failed & {
		color: var(--color-danger);
	}

	.waiting & {
		color: var(--color-secondary);
	}

	.success & {
		font-weight: var(--font-weight-normal);
	}

	.new &,
	.running & {
		color: var(--color-warning);
	}

	.unknown & {
		color: var(--color-background-dark);
	}
}

.execTable {
	/*
	  Table height needs to be set to 0 in order to use height 100% for elements in table cells
	*/
	height: 0;
	width: 100%;
	text-align: left;
	font-size: var(--font-size-s);

	thead th {
		position: sticky;
		top: calc(var(--spacing-3xl) * -1);
		z-index: 2;
		padding: var(--spacing-s) var(--spacing-s) var(--spacing-s) 0;
		background: var(--color-background-base);

		&:first-child {
			padding-left: var(--spacing-s);
		}
	}

	th,
	td {
		height: 100%;
		padding: var(--spacing-s) var(--spacing-s) var(--spacing-s) 0;
		background: var(--color-background-xlight);

		&:not(:first-child, :nth-last-child(-n + 3)) {
			width: 100%;
		}

		&:nth-last-child(-n + 2) {
			padding-left: 0;
		}

		@media (min-width: $breakpoint-sm) {
			&:not(:nth-child(2)) {
				&,
				div,
				span {
					white-space: nowrap;
				}
			}
		}
	}

	.execRow {
		color: var(--color-text-base);

		td:first-child {
			width: 30px;
			padding: 0 var(--spacing-s) 0 0;

			/*
			  This is needed instead of table cell border because they are overlapping the sticky header
			*/
			&::before {
				content: '';
				display: inline-block;
				width: var(--spacing-4xs);
				height: 100%;
				vertical-align: middle;
				margin-right: var(--spacing-xs);
			}
		}

		&:nth-child(even) td {
			background: var(--color-background-light);
		}

		&:hover td {
			background: var(--color-primary-tint-3);
		}

		&.crashed td:first-child::before,
		&.failed td:first-child::before {
			background: hsl(var(--color-danger-h), 94%, 80%);
		}

		&.success td:first-child::before {
			background: hsl(var(--color-success-h), 60%, 70%);
		}

		&.new td:first-child::before,
		&.running td:first-child::before {
			background: hsl(var(--color-warning-h), 94%, 80%);
		}

		&.waiting td:first-child::before {
			background: hsl(var(--color-secondary-h), 94%, 80%);
		}

		&.unknown td:first-child::before {
			background: var(--color-text-light);
		}
	}
}

.tableLoader {
	width: 100%;
	height: 48px;
	margin-bottom: var(--spacing-2xs);
}

.link {
	color: var(--color-text-base);
	text-decoration: underline;
}

.executionlink {
	padding-bottom: 10px;
}
</style>
