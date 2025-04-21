<script setup lang="ts">
import ConsumedTokenCountText from '@/components/CanvasChat/future/components/ConsumedTokenCountText.vue';
import { useI18n } from '@/composables/useI18n';
import { type LlmTokenUsageData } from '@/Interface';
import { N8nText } from '@n8n/design-system';
import { upperFirst } from 'lodash-es';
import { type ExecutionStatus } from 'n8n-workflow';
import { computed } from 'vue';

const { status, consumedTokens, timeTook } = defineProps<{
	status: ExecutionStatus;
	consumedTokens: LlmTokenUsageData;
	timeTook?: number;
}>();

const locale = useI18n();
const executionStatusText = computed(() =>
	timeTook === undefined
		? upperFirst(status)
		: locale.baseText('logs.overview.body.summaryText', {
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
		<ConsumedTokenCountText
			v-if="consumedTokens.totalTokens > 0"
			:consumed-tokens="consumedTokens"
		/>
	</N8nText>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;

	& > * {
		padding-inline: var(--spacing-2xs);
		flex-shrink: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	& > *:not(:last-child) {
		border-right: var(--border-base);
	}
}
</style>
