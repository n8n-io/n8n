<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nText, N8nLoading, N8nIcon } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowHistoryStore } from '../workflowHistory.store';
import type { PublishTimelineEvent } from '@n8n/rest-api-client/api/workflowHistory';
import dateformat from 'dateformat';

const props = defineProps<{
	modalName: string;
	workflowId: string;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const workflowHistoryStore = useWorkflowHistoryStore();

const isLoading = ref(true);
const events = ref<PublishTimelineEvent[]>([]);

type TimelinePeriod = {
	status: 'published' | 'unpublished';
	startedAt: Date;
	endedAt: Date | null;
	versionId: string | null;
	user: string | null;
	isCurrent: boolean;
};

const periods = computed<TimelinePeriod[]>(() => {
	if (events.value.length === 0) return [];

	const result: TimelinePeriod[] = [];

	for (let idx = 0; idx < events.value.length; idx++) {
		const event = events.value[idx];
		const nextEvent = events.value[idx + 1];

		if (event.event === 'activated') {
			result.push({
				status: 'published',
				startedAt: new Date(event.createdAt),
				endedAt: nextEvent ? new Date(nextEvent.createdAt) : null,
				versionId: event.versionId,
				user: event.user ? `${event.user.firstName} ${event.user.lastName}` : null,
				isCurrent: !nextEvent,
			});
		} else {
			result.push({
				status: 'unpublished',
				startedAt: new Date(event.createdAt),
				endedAt: nextEvent ? new Date(nextEvent.createdAt) : null,
				versionId: null,
				user: event.user ? `${event.user.firstName} ${event.user.lastName}` : null,
				isCurrent: !nextEvent,
			});
		}
	}

	return result.reverse();
});

const formatDate = (date: Date) => {
	return dateformat(date, 'mmm d, yyyy HH:MM:ss');
};

const formatDuration = (start: Date, end: Date | null) => {
	const endDate = end ?? new Date();
	const diffMs = endDate.getTime() - start.getTime();

	const seconds = Math.floor(diffMs / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		const remainingHours = hours % 24;
		return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
	}
	if (hours > 0) {
		const remainingMinutes = minutes % 60;
		return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
	}
	if (minutes > 0) return `${minutes}m`;
	return `${seconds}s`;
};

const isModalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

watch(isModalOpen, async (open) => {
	if (!open) return;
	isLoading.value = true;
	try {
		events.value = await workflowHistoryStore.getPublishTimeline(props.workflowId);
	} finally {
		isLoading.value = false;
	}
});
</script>

<template>
	<Modal width="600px" :name="props.modalName">
		<template #header>
			<N8nHeading tag="h2" size="xlarge">
				{{ i18n.baseText('workflowHistory.publishTimeline.title') }}
			</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nLoading v-if="isLoading" :rows="4" />
				<div v-else-if="periods.length === 0" :class="$style.empty">
					<N8nText>{{ i18n.baseText('workflowHistory.publishTimeline.empty') }}</N8nText>
				</div>
				<template v-else>
					<div :class="$style.legend">
						<div :class="$style.legendItem">
							<span :class="[$style.legendDot, $style.dotPublished]" />
							<N8nText size="small">
								{{ i18n.baseText('workflowHistory.publishTimeline.event.activated') }}
							</N8nText>
						</div>
						<div :class="$style.legendItem">
							<span :class="[$style.legendDot, $style.dotUnpublished]" />
							<N8nText size="small">
								{{ i18n.baseText('workflowHistory.publishTimeline.event.deactivated') }}
							</N8nText>
						</div>
					</div>

					<div :class="$style.timeline">
						<div v-for="(period, idx) in periods" :key="idx" :class="$style.timelineItem">
							<div :class="$style.timelineIndicator">
								<span
									:class="[
										$style.timelineDot,
										period.status === 'published' ? $style.dotPublished : $style.dotUnpublished,
									]"
								/>
								<span v-if="idx < periods.length - 1" :class="$style.timelineLine" />
							</div>
							<div :class="$style.timelineContent">
								<div :class="$style.timelineHeader">
									<N8nText :bold="true" size="small">
										<template v-if="period.status === 'published'">
											{{ i18n.baseText('workflowHistory.publishTimeline.event.activated') }}
										</template>
										<template v-else>
											{{ i18n.baseText('workflowHistory.publishTimeline.event.deactivated') }}
										</template>
									</N8nText>
									<N8nText v-if="period.isCurrent" size="small" color="text-light">
										<template v-if="period.status === 'published'">
											{{ i18n.baseText('workflowHistory.publishTimeline.currentlyPublished') }}
										</template>
										<template v-else>
											{{ i18n.baseText('workflowHistory.publishTimeline.currentlyUnpublished') }}
										</template>
									</N8nText>
								</div>
								<N8nText size="small" color="text-light">
									{{ formatDate(period.startedAt) }}
									<template v-if="period.user">
										&middot;
										{{
											i18n.baseText('workflowHistory.publishTimeline.by', {
												interpolate: { user: period.user },
											})
										}}
									</template>
								</N8nText>
								<div :class="$style.durationBadge">
									<N8nIcon icon="clock" size="small" />
									<N8nText size="small">
										{{ formatDuration(period.startedAt, period.endedAt) }}
									</N8nText>
								</div>
								<N8nText v-if="period.versionId" size="small" color="text-light">
									Version {{ period.versionId.substring(0, 8) }}
								</N8nText>
							</div>
						</div>
					</div>
				</template>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.content {
	min-height: 200px;
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 200px;
}

.legend {
	display: flex;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--lg);
}

.legendItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.legendDot {
	display: inline-block;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	flex-shrink: 0;
}

.dotPublished {
	background-color: var(--color--success);
}

.dotUnpublished {
	background-color: var(--color--foreground--shade-1);
}

.timeline {
	display: flex;
	flex-direction: column;
}

.timelineItem {
	display: flex;
	gap: var(--spacing--xs);
}

.timelineIndicator {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: var(--spacing--sm);
	flex-shrink: 0;
}

.timelineDot {
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	flex-shrink: 0;
	margin-top: 3px;
}

.timelineLine {
	width: 2px;
	flex-grow: 1;
	background-color: var(--color--foreground);
	min-height: var(--spacing--sm);
}

.timelineContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding-bottom: var(--spacing--sm);
}

.timelineHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.durationBadge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	background-color: var(--color--background);
	border-radius: var(--radius);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	width: fit-content;
}
</style>
