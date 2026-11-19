<script lang="ts" setup>
import type { AgentThreadMemoryDto } from '@n8n/api-types';
import { N8nAiActivityStepButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import type { TimelineItem } from '../../session-timeline.types';
import { memoryTimelineName } from '../../session-timeline.utils';
import { formatTimelineTime } from '../../utils/timeline-time';
import SessionMemoryDetail from '../SessionMemoryDetail.vue';
import SessionTimelinePill from '../SessionTimelinePill.vue';

const props = defineProps<{
	item: TimelineItem;
	selected: boolean;
	searchQuery?: string;
	memory?: AgentThreadMemoryDto;
	projectId?: string;
	agentId?: string;
	threadId?: string;
	onDeleted?: () => void;
}>();

const i18n = useI18n();

const label = computed(() => memoryTimelineName(props.item, i18n));
const time = computed(() => formatTimelineTime(props.item.timestamp));
</script>

<template>
	<div data-test-id="session-memory-item" :class="$style.item">
		<div :class="$style.header">
			<N8nAiActivityStepButton
				:class="$style.activityButton"
				size="small"
				:interactive="false"
				tabindex="-1"
			>
				<template #prefix>
					<span :class="$style.iconContainer">
						<SessionTimelinePill :kind="item.kind" :label="label" />
					</span>
				</template>
				{{ label }}
			</N8nAiActivityStepButton>
			<N8nText step="xs" color="text-light" bold>{{ time }}</N8nText>
		</div>
		<SessionMemoryDetail
			v-if="projectId && agentId && threadId"
			:item="item"
			:memory="memory"
			:project-id="projectId"
			:agent-id="agentId"
			:thread-id="threadId"
			@deleted="onDeleted?.()"
		/>
	</div>
</template>

<style module lang="scss">
.item {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-inline: var(--spacing--2xs);

	--ai-activity-step--color: var(--text-color--subtle);
}

/* Matches the tool row header so names, icons, and times line up. */
.activityButton {
	--ai-activity-step--padding: var(--spacing--2xs);
}

.iconContainer {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	flex-shrink: 0;
	border-radius: var(--radius);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-inline-end: var(--spacing--2xs);
	font-variant-numeric: tabular-nums;
}
</style>
