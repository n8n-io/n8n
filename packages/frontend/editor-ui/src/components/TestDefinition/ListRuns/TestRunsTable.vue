<script setup lang="ts">
import type { TestRunRecord } from '@/api/testDefinition.ee';
import { useI18n } from '@/composables/useI18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { computed, ref } from 'vue';
import type { TestTableColumn } from '../shared/TestTableBase.vue';
import TestTableBase from '../shared/TestTableBase.vue';

const emit = defineEmits<{
	rowClick: [run: TestRunRecord];
	selectionChange: [runs: TestRunRecord[]];
	deleteRuns: [runs: TestRunRecord[]];
}>();

const props = defineProps<{
	runs: TestRunRecord[];
	columns: Array<TestTableColumn<TestRunRecord>>;
	selectable?: boolean;
}>();

const statusesColorDictionary: Record<TestRunRecord['status'], string> = {
	new: 'var(--color-primary)',
	running: 'var(--color-secondary)',
	completed: 'var(--color-success)',
	error: 'var(--color-danger)',
	cancelled: 'var(--color-foreground-dark)',
	warning: 'var(--color-warning)',
	success: 'var(--color-success)',
};

const locale = useI18n();

const selectedRows = ref<TestRunRecord[]>([]);

// Combine test run statuses and finalResult to get the final status
const runSummaries = computed(() => {
	return props.runs.map(({ status, finalResult, ...run }) => {
		if (status === 'completed' && finalResult) {
			return { ...run, status: finalResult };
		}

		return { ...run, status };
	});
});

function onSelectionChange(runs: TestRunRecord[]) {
	selectedRows.value = runs;
	emit('selectionChange', runs);
}

async function deleteRuns() {
	emit('deleteRuns', selectedRows.value);
}
</script>

<template>
	<div :class="$style.container">
		<N8nHeading size="large" :bold="true" :class="$style.runsTableHeading">{{
			locale.baseText('testDefinition.edit.pastRuns.total', { adjustToNumber: runs.length })
		}}</N8nHeading>
		<div :class="$style.header">
			<n8n-button
				v-show="selectedRows.length > 0"
				type="danger"
				:class="$style.activator"
				size="medium"
				icon="trash"
				data-test-id="delete-runs-button"
				@click="deleteRuns"
			>
				{{
					locale.baseText('testDefinition.listRuns.deleteRuns', {
						adjustToNumber: selectedRows.length,
					})
				}}
			</n8n-button>
		</div>

		<TestTableBase
			:data="runSummaries"
			:columns="columns"
			selectable
			:default-sort="{ prop: 'runAt', order: 'descending' }"
			@row-click="(row) => emit('rowClick', row)"
			@selection-change="onSelectionChange"
		>
			<template #status="{ row }">
				<div
					style="display: inline-flex; gap: 8px; text-transform: capitalize; align-items: center"
				>
					<N8nIcon
						icon="circle"
						size="xsmall"
						:style="{ color: statusesColorDictionary[row.status] }"
					></N8nIcon>
					<N8nText v-if="row.status === 'error'" size="small" bold color="text-base">
						{{ row.failedCases }} / {{ row.totalCases }} {{ row.status }}
					</N8nText>
					<N8nText v-else size="small" bold color="text-base">
						{{ row.status }}
					</N8nText>
				</div>
			</template>
		</TestTableBase>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: 10px;
	flex: 1;
}
</style>
