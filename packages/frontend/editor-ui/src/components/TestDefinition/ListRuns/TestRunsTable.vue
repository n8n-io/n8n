<script setup lang="ts">
import type { TestRunRecord } from '@/api/testDefinition.ee';
import { useI18n } from '@/composables/useI18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { IconColor } from '@n8n/design-system/types/icon';
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

const statusDictionary: Record<TestRunRecord['status'], { icon: string; color: IconColor }> = {
	new: {
		icon: 'status-new',
		color: 'foreground-xdark',
	},
	running: {
		icon: 'spinner',
		color: 'secondary',
	},
	completed: {
		icon: 'status-completed',
		color: 'success',
	},
	error: {
		icon: 'status-error',
		color: 'danger',
	},
	cancelled: {
		icon: 'status-canceled',
		color: 'foreground-xdark',
	},
	warning: {
		icon: 'status-warning',
		color: 'warning',
	},
	success: {
		icon: 'status-completed',
		color: 'success',
	},
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
		<N8nHeading size="large" :bold="true" :class="$style.runsTableHeading">
			{{ locale.baseText('testDefinition.edit.pastRuns.total', { adjustToNumber: runs.length }) }}
		</N8nHeading>
		<div v-if="selectedRows.length" :class="$style.header">
			<n8n-button
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
					<N8nText v-if="row.status === 'running'" color="secondary" class="mr-2xs">
						<AnimatedSpinner />
					</N8nText>
					<N8nIcon
						v-else
						:icon="statusDictionary[row.status].icon"
						:color="statusDictionary[row.status].color"
						class="mr-2xs"
					/>
					<template v-if="row.status === 'error'">
						{{ row.failedCases }} {{ row.status }}
					</template>
					<template v-else>
						{{ row.status }}
					</template>
				</div>
			</template>
		</TestTableBase>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: 8px;
}
</style>
