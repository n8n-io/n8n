<script setup lang="ts">
import type { TestRunRecord } from '@/api/evaluation.ee';
import { useI18n } from '@/composables/useI18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { computed } from 'vue';
import type { TestTableColumn } from '../shared/TestTableBase.vue';
import TestTableBase from '../shared/TestTableBase.vue';
import { statusDictionary } from '../shared/statusDictionary';
const emit = defineEmits<{
	rowClick: [run: TestRunRecord & { index: number }];
}>();

const props = defineProps<{
	runs: Array<TestRunRecord & { index: number }>;
	columns: Array<TestTableColumn<TestRunRecord & { index: number }>>;
}>();

const locale = useI18n();

// Combine test run statuses and finalResult to get the final status
const runSummaries = computed(() => {
	return props.runs.map(({ status, finalResult, ...run }) => {
		if (status === 'completed' && finalResult) {
			return { ...run, status: finalResult };
		}

		return { ...run, status };
	});
});
</script>

<template>
	<div :class="$style.container">
		<N8nHeading size="large" :bold="true" :class="$style.runsTableHeading" color="text-base">
			{{ locale.baseText('evaluation.edit.pastRuns.total', { adjustToNumber: runs.length }) }}
			<N8nText> ({{ runs.length }}) </N8nText>
		</N8nHeading>

		<TestTableBase
			:data="runSummaries"
			:columns="columns"
			:default-sort="{ prop: 'runAt', order: 'descending' }"
			@row-click="(row) => emit('rowClick', row)"
		>
			<template #id="{ row }">#{{ row.index }} </template>
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
						{{ row.status }}
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
