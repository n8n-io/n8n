<script setup lang="ts">
import type { TestRunRecord } from '@/api/evaluation.ee';
import { useI18n } from '@/composables/useI18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { computed } from 'vue';
import type { TestTableColumn } from '../shared/TestTableBase.vue';
import type { BaseTextKey } from '@/plugins/i18n';
import TestTableBase from '../shared/TestTableBase.vue';
import { statusDictionary } from '../shared/statusDictionary';
import { getErrorBaseKey } from '@/components/Evaluations/shared/errorCodes';
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
	return props.runs.map(({ status, finalResult, errorDetails, ...run }) => {
		if (status === 'completed' && finalResult && ['error', 'warning'].includes(finalResult)) {
			status = 'warning';
		}
		return { ...run, status, finalResult, errorDetails };
	});
});
</script>

<template>
	<div :class="$style.container">
		<N8nHeading size="large" :bold="true" :class="$style.runsTableHeading" color="text-base">
			{{ locale.baseText('evaluation.edit.pastRuns.total', { adjustToNumber: runs.length }) }}
			({{ runs.length }})
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
					<template v-if="row.status === 'warning'">
						<N8nText color="warning" size="small" style="text-transform: none">
							{{ locale.baseText(`evaluation.runDetail.error.partialCasesFailed`) }}
						</N8nText>
					</template>
					<template v-else-if="row.status === 'error'">
						<N8nTooltip placement="right" :show-after="300">
							<template #content>
								{{
									locale.baseText(`${getErrorBaseKey(row.errorCode)}` as BaseTextKey) ||
									locale.baseText(`${getErrorBaseKey('UNKNOWN_ERROR')}` as BaseTextKey)
								}}
							</template>

							<div
								style="
									display: inline-flex;
									text-transform: none;
									text-overflow: ellipsis;
									overflow: hidden;
									white-space: nowrap;
								"
							>
								<N8nText size="small" color="danger">
									{{
										locale.baseText(`${getErrorBaseKey(row?.errorCode)}` as BaseTextKey) ||
										locale.baseText(`${getErrorBaseKey('UNKNOWN_ERROR')}` as BaseTextKey)
									}}
								</N8nText>
							</div>
						</N8nTooltip>
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
