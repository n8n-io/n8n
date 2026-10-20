<script setup lang="ts">
import LogsViewConsumedTokenCountText from '@/features/execution/logs/components/LogsViewConsumedTokenCountText.vue';
import { useI18n } from '@n8n/i18n';
import { type LlmTokenUsageData } from '@/Interface';
import { useTimestamp } from '@vueuse/core';
import upperFirst from 'lodash/upperFirst';
import { type ExecutionStatus } from 'n8n-workflow';
import { computed } from 'vue';

import { N8nText, N8nTooltip } from '@n8n/design-system';
const { status, consumedTokens, startTime, timeTook, respondingModel } = defineProps<{
	status: ExecutionStatus;
	consumedTokens: LlmTokenUsageData;
	startTime: number;
	timeTook?: number;
	respondingModel?: string;
}>();

const locale = useI18n();
const now = useTimestamp({ interval: 1000 });
const executionStatusText = computed(() =>
	status === 'running' || status === 'waiting'
		? locale.baseText('logs.overview.body.summaryText.for', {
				interpolate: {
					status: upperFirst(status),
					time: locale.displayTimer(Math.floor((now.value - startTime) / 1000) * 1000, true),
				},
			})
		: timeTook === undefined
			? upperFirst(status)
			: locale.baseText('logs.overview.body.summaryText.in', {
					interpolate: {
						status: upperFirst(status),
						time: locale.displayTimer(timeTook, true),
					},
				}),
);
</script>

<template>
	<N8nText tag="div" color="text-light" size="small" :class="$style.container">
		<span>{{ executionStatusText }}</span>
		<LogsViewConsumedTokenCountText
			v-if="consumedTokens.totalTokens > 0"
			:consumed-tokens="consumedTokens"
		/>
		<N8nTooltip v-if="respondingModel" :enterable="false">
			<span>{{
				locale.baseText('runData.aiContentBlock.model', {
					interpolate: { model: respondingModel },
				})
			}}</span>
			<template #content>
				{{ locale.baseText('runData.aiContentBlock.model.tooltip') }}
			</template>
		</N8nTooltip>
	</N8nText>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;

	& > * {
		padding-inline: var(--spacing--2xs);
		flex-shrink: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	& > *:not(:last-child) {
		border-right: var(--border);
	}
}
</style>
