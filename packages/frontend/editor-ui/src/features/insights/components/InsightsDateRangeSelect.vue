<script setup lang="ts">
import { useInsightsStore } from '@/features/insights/insights.store';
import type { InsightsDateRange } from '@n8n/api-types';
import { N8nOption, N8nSelect } from '@n8n/design-system';
import { ref } from 'vue';
import { UNLICENSED_TIME_RANGE } from '../insights.constants';
import { getTimeRangeLabels } from '../insights.utils';

const model = defineModel<InsightsDateRange['key'] | typeof UNLICENSED_TIME_RANGE>({
	required: true,
});

const insightsStore = useInsightsStore();

const timeRangeLabels = getTimeRangeLabels();

const timeOptions = ref(
	insightsStore.dateRanges.map((option) => {
		return {
			key: option.key,
			label: timeRangeLabels[option.key],
			value: option.licensed ? option.key : UNLICENSED_TIME_RANGE,
			licensed: option.licensed,
		};
	}),
);
</script>

<template>
	<N8nSelect v-model="model" size="small">
		<N8nOption v-for="item in timeOptions" :key="item.key" :value="item.value" :label="item.label">
			{{ item.label }}
			<svg
				v-if="!item.licensed"
				width="16"
				height="17"
				viewBox="0 0 16 17"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				style="margin-left: auto"
			>
				<path
					d="M12.6667 7.83337H3.33333C2.59695 7.83337 2 8.43033 2 9.16671V13.8334C2 14.5698 2.59695 15.1667 3.33333 15.1667H12.6667C13.403 15.1667 14 14.5698 14 13.8334V9.16671C14 8.43033 13.403 7.83337 12.6667 7.83337Z"
					stroke="#9A9A9A"
					stroke-width="1.33333"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M4.66681 7.83337V5.16671C4.66681 4.28265 5.018 3.43481 5.64312 2.80968C6.26824 2.18456 7.11609 1.83337 8.00014 1.83337C8.8842 1.83337 9.73204 2.18456 10.3572 2.80968C10.9823 3.43481 11.3335 4.28265 11.3335 5.16671V7.83337"
					stroke="#9A9A9A"
					stroke-width="1.33333"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</N8nOption>
	</N8nSelect>
</template>
