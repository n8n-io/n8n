<script setup lang="ts">
import { computed } from 'vue';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import WorkflowHistoryVersionDot from './WorkflowHistoryVersionDot.vue';
import { formatTimestamp } from '../utils';
import type { WorkflowHistoryVersionStatus } from '../types';

const props = defineProps<{
	label: string;
	status: WorkflowHistoryVersionStatus;
	publishInfo: {
		publishedBy: string | null;
		publishedAt: string;
	};
}>();

const i18n = useI18n();

const publishedByDetails = computed(() => {
	const { date, time } = formatTimestamp(props.publishInfo.publishedAt);
	const publishedAt = i18n.baseText('workflowHistory.item.createdAt', {
		interpolate: { date, time },
	});
	const publishedByLabel = i18n.baseText('workflowHistory.item.publishedBy');
	const publishedBy = props.publishInfo.publishedBy ?? 'Unknown';

	return `${publishedByLabel} ${publishedBy}, ${publishedAt}`;
});
</script>

<template>
	<div>
		<div :class="$style.tooltipContentTitle">
			<WorkflowHistoryVersionDot :status="status" />
			<N8nText size="small" :bold="true">
				{{ label }} ({{ i18n.baseText('workflows.published') }})
			</N8nText>
		</div>
		<N8nText size="small" :class="$style.tooltipSecondaryText">
			{{ publishedByDetails }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.tooltipContentTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.tooltipSecondaryText {
	color: var(--color--text--tint-1);
	display: block;
	padding-left: calc(8px + var(--spacing--3xs));
}
</style>
