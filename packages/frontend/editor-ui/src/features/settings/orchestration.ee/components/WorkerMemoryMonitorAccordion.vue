<script setup lang="ts">
import type { WorkerStatus } from '@n8n/api-types';
import WorkerAccordion from './WorkerAccordion.vue';
import { useI18n } from '@n8n/i18n';
import { memAsGb, memAsMb } from '@/features/settings/orchestration.ee/orchestration.utils';

const props = defineProps<{
	worker: WorkerStatus;
}>();

const i18n = useI18n();
</script>

<template>
	<WorkerAccordion icon="list-checks" icon-color="text-dark" :initial-expanded="false">
		<template #title>
			{{ i18n.baseText('workerList.item.memoryMonitorTitle') }}
		</template>
		<template #content>
			<div :class="$style['accordion-content']">
				<strong>Host/OS Memory:</strong>
				<table>
					<tbody>
						<tr>
							<th>Total (os.totalmem)</th>
							<td>{{ memAsGb(props.worker.host.memory.total) }}GB</td>
						</tr>
						<tr>
							<th>Free (os.freemem)</th>
							<td>{{ memAsGb(props.worker.host.memory.free) }}GB</td>
						</tr>
					</tbody>
				</table>
				<br />
				<strong>Process Memory:</strong><br />
				<table>
					<tbody>
						<tr v-if="worker.isInContainer">
							<th>Constraint: (process.constrainedMemory)</th>
							<td>{{ memAsMb(props.worker.process.memory.constraint) }}MB</td>
						</tr>
						<tr>
							<th>Available: (process.availableMemory)</th>
							<td>{{ memAsMb(props.worker.process.memory.available) }}MB</td>
						</tr>
						<tr>
							<th>RSS: (process.memoryUsage().rss)</th>
							<td>{{ memAsMb(props.worker.process.memory.rss) }}MB</td>
						</tr>
						<tr>
							<th>Heap total: (process.memoryUsage().heapTotal)</th>
							<td>{{ memAsMb(props.worker.process.memory.heapTotal) }}MB</td>
						</tr>
						<tr>
							<th>Heap used: (process.memoryUsage().heapUsed)</th>
							<td>{{ memAsMb(props.worker.process.memory.heapUsed) }}MB</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>
	</WorkerAccordion>
</template>

<style lang="scss" module>
table {
	th,
	td {
		text-align: left;
		font-weight: normal;
	}
	td {
		font-variant-numeric: tabular-nums;
		padding-left: 8px;
	}
}

.accordion-content {
	padding: var(--spacing--2xs);
}
</style>
