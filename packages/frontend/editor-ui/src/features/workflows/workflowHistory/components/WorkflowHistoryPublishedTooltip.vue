<script setup lang="ts">
import { toRef } from 'vue';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import WorkflowHistoryVersionDot from './WorkflowHistoryVersionDot.vue';
import type { N8nTooltipProps } from '@n8n/design-system/components/N8nTooltip';
import type { WorkflowHistoryVersionStatus } from '../types';
import { usePublishedByDetails } from './usePublishedByDetails';

defineSlots<{
	default: () => unknown;
}>();

const props = withDefaults(
	defineProps<{
		label: string;
		status: WorkflowHistoryVersionStatus;
		publishInfo?: {
			publishedBy: string | null;
			publishedAt: string;
		};
		placement?: N8nTooltipProps['placement'];
		offset?: number;
	}>(),
	{
		publishInfo: undefined,
		placement: 'left',
		offset: 8,
	},
);

const i18n = useI18n();

const publishedByDetails = usePublishedByDetails(toRef(props, 'publishInfo'));
</script>

<template>
	<N8nTooltip
		:disabled="!props.publishInfo"
		:placement="props.placement"
		:show-after="300"
		:offset="props.offset"
		:content-class="$style.tooltipContent"
	>
		<template #content>
			<div v-if="props.publishInfo">
				<div :class="$style.tooltipContentTitle">
					<WorkflowHistoryVersionDot :status="props.status" />
					<N8nText size="small" :bold="true">
						{{ props.label }} ({{ i18n.baseText('workflows.published') }})
					</N8nText>
				</div>
				<N8nText size="small" :class="$style.tooltipSecondaryText">
					{{ publishedByDetails }}
				</N8nText>
			</div>
		</template>
		<slot />
	</N8nTooltip>
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
	// This padding is to align the secondary text with the title text (to cover for the status dot space)
	padding-left: calc(var(--spacing--3xs) + var(--spacing--2xs));
}

.tooltipContent {
	max-width: 320px;
}
</style>
