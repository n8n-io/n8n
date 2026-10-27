<script lang="ts" setup>
import { formatTimelineTime } from '../../utils/timeline-time';
import {
	N8nAiActivityStepButton,
	N8nAiActivityStepChevron,
	N8nAiActivityStepResultSection,
	N8nAnimatedCollapsibleContent,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed } from 'vue';
import { useTimelineItemExpansion } from '../../composables/useTimelineItemExpansion';
import type { TimelineItem } from '../../session-timeline.types';
import { backgroundJobSignalSummary } from '../../session-timeline.utils';
import { backgroundJobResultLabel } from '../../utils/background-job-labels';
import SessionTimelinePill from '../SessionTimelinePill.vue';

const props = defineProps<{
	item: TimelineItem;
	selected: boolean;
	searchQuery?: string;
}>();

const i18n = useI18n();

const tasks = computed(function getTasks() {
	return props.item.backgroundJobSignal?.tasks ?? [];
});

const label = computed(function getLabel() {
	return (
		backgroundJobSignalSummary(props.item, i18n) ||
		i18n.baseText('agents.chat.backgroundTasks.resultsReceived')
	);
});

const canExpand = computed(function getCanExpand() {
	return tasks.value.length > 0;
});

const time = computed(() => formatTimelineTime(props.item.timestamp));

const { isOpen } = useTimelineItemExpansion({
	searchQuery: () => props.searchQuery,
	canExpand,
	searchableText: label,
});
</script>

<template>
	<div data-test-id="session-background-job-item" :class="$style.step">
		<CollapsibleRoot
			:open="canExpand && isOpen"
			:disabled="!canExpand"
			@update:open="isOpen = canExpand && $event"
		>
			<div :class="$style.header">
				<CollapsibleTrigger as-child>
					<N8nAiActivityStepButton
						:class="$style.activityButton"
						size="small"
						:interactive="canExpand"
						:tabindex="canExpand ? undefined : -1"
						:aria-disabled="!canExpand || undefined"
					>
						<template #prefix>
							<N8nTooltip
								:content="i18n.baseText('agents.chat.backgroundTasks.resultsReceived')"
								placement="top"
							>
								<span :class="$style.iconContainer">
									<SessionTimelinePill :kind="item.kind" :label="label" />
								</span>
							</N8nTooltip>
						</template>
						{{ label }}
						<template v-if="canExpand" #suffix>
							<N8nAiActivityStepChevron :open="isOpen" />
						</template>
					</N8nAiActivityStepButton>
				</CollapsibleTrigger>
				<N8nText step="xs" color="text-light" bold :class="$style.time">
					{{ time }}
				</N8nText>
			</div>
			<N8nAnimatedCollapsibleContent v-if="canExpand">
				<N8nAiActivityStepResultSection :class="$style.section">
					<ul data-test-id="background-job-signal-details" :class="$style.tasks">
						<li v-for="job in tasks" :key="job.id">
							{{ backgroundJobResultLabel(job, i18n) }}
						</li>
					</ul>
				</N8nAiActivityStepResultSection>
			</N8nAnimatedCollapsibleContent>
		</CollapsibleRoot>
	</div>
</template>

<style module lang="scss">
.step .activityButton {
	--ai-activity-step--padding: var(--spacing--2xs);
	--button--color--background-hover: var(--background--hover);
	--button--color--background-active: var(--background--active);
}

.step {
	margin-inline: var(--spacing--2xs);
	--ai-activity-step--color: var(--text-color--subtle);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-inline-end: var(--spacing--2xs);
	text-align: right;
	font-variant-numeric: tabular-nums;

	> button {
		min-width: 0;
	}

	> button:disabled {
		pointer-events: none;
	}
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

.time {
	flex-shrink: 0;
	white-space: nowrap;
}

.section {
	background-color: transparent;
	border: 0;
	padding-inline: var(--spacing--md);
	margin-block: 0;
	border-left: var(--border);
	border-radius: 0;

	/** Align the rail with the icon center. */
	transform: translateX(calc(var(--spacing--sm) + var(--spacing--5xs)));
}

.tasks {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-block: var(--spacing--xs);
	padding-inline-start: var(--spacing--md);
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	overflow-wrap: anywhere;
}
</style>
