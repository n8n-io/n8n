<script setup lang="ts">
import type { TestRunRecord } from '@/api/testDefinition.ee';
import { useI18n } from '@/composables/useI18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { IconColor } from '@n8n/design-system/types/icon';
import { computed } from 'vue';
import type { TestTableColumn } from '../shared/TestTableBase.vue';
import TestTableBase from '../shared/TestTableBase.vue';

const emit = defineEmits<{
	rowClick: [run: TestRunRecord & { index: number }];
}>();

const props = defineProps<{
	runs: Array<TestRunRecord & { index: number }>;
	columns: Array<TestTableColumn<TestRunRecord & { index: number }>>;
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
			{{ locale.baseText('testDefinition.edit.pastRuns.total', { adjustToNumber: runs.length }) }}
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
