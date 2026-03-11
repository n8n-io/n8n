<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nHeading,
	N8nText,
	N8nLoading,
	N8nIcon,
	N8nCallout,
	N8nTooltip,
} from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowHistoryStore } from '../workflowHistory.store';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import type { PublishTimelineEvent } from '@n8n/rest-api-client/api/workflowHistory';
import dateformat from 'dateformat';

const DOWNTIME_DISCLAIMER_CALLOUT = 'publishTimelineDowntimeDisclaimer';
/** Threshold to filter out transient deactivation/reactivation gaps during version changes */
const MIN_UNPUBLISHED_DURATION_MS = 2000;

const props = defineProps<{
	modalName: string;
	workflowId: string;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const workflowHistoryStore = useWorkflowHistoryStore();

const { isCalloutDismissed, dismissCallout } = useCalloutHelpers();
const isLoading = ref(true);
const events = ref<PublishTimelineEvent[]>([]);
const versionNames = ref<Map<string, string | null>>(new Map());

type TimelinePeriod = {
	status: 'published' | 'unpublished';
	startedAt: Date;
	endedAt: Date | null;
	versionId: string | null;
	versionName: string | null;
	user: string | null;
	isCurrent: boolean;
};

const periods = computed<TimelinePeriod[]>(() => {
	if (events.value.length === 0) return [];

	const result: TimelinePeriod[] = [];

	for (let idx = 0; idx < events.value.length; idx++) {
		const event = events.value[idx];
		const nextEvent = events.value[idx + 1];
		const isActivated = event.event === 'activated';

		result.push({
			status: isActivated ? 'published' : 'unpublished',
			startedAt: new Date(event.createdAt),
			endedAt: nextEvent ? new Date(nextEvent.createdAt) : null,
			versionId: isActivated ? event.versionId : null,
			versionName: isActivated ? (versionNames.value.get(event.versionId) ?? null) : null,
			user: event.user ? `${event.user.firstName} ${event.user.lastName}` : null,
			isCurrent: !nextEvent,
		});
	}

	// Filter out brief unpublished periods — these are not actual unpublishes
	// but version changes where the workflow was deactivated and immediately reactivated
	return result.toReversed().filter((period) => {
		if (period.status !== 'unpublished' || period.endedAt === null) return true;
		return period.endedAt.getTime() - period.startedAt.getTime() >= MIN_UNPUBLISHED_DURATION_MS;
	});
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
		const timelineEvents = await workflowHistoryStore.getPublishTimeline(props.workflowId);
		const activatedVersionIds = [
			...new Set(timelineEvents.filter((e) => e.event === 'activated').map((e) => e.versionId)),
		];
		const nameMap = new Map<string, string | null>();
		if (activatedVersionIds.length > 0) {
			const versions = await workflowHistoryStore.lookupVersions(props.workflowId, {
				versionIds: activatedVersionIds,
				fields: ['name'],
			});
			for (const version of versions) {
				nameMap.set(version.versionId, version.name ?? null);
			}
		}
		versionNames.value = nameMap;
		events.value = timelineEvents;
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
				<N8nCallout
					v-if="!isCalloutDismissed(DOWNTIME_DISCLAIMER_CALLOUT)"
					theme="info"
					:class="$style.disclaimer"
				>
					{{ i18n.baseText('workflowHistory.publishTimeline.downtimeDisclaimer') }}
					<template #trailingContent>
						<N8nIcon
							icon="times"
							size="small"
							:class="$style.dismissButton"
							@click="dismissCallout(DOWNTIME_DISCLAIMER_CALLOUT)"
						/>
					</template>
				</N8nCallout>
				<N8nLoading v-if="isLoading" :rows="4" />
				<div v-else-if="periods.length === 0" :class="$style.empty">
					<N8nText>{{ i18n.baseText('workflowHistory.publishTimeline.empty') }}</N8nText>
				</div>
				<template v-else>
					<div :class="$style.timeline">
						<div v-for="(period, idx) in periods" :key="idx" :class="$style.timelineItem">
							<div :class="$style.timelineIndicator">
								<span
									:class="[
										$style.timelineDot,
										period.status === 'unpublished'
											? $style.dotUnpublished
											: period.isCurrent
												? $style.dotPublished
												: $style.dotPastPublished,
									]"
								/>
								<span v-if="idx < periods.length - 1" :class="$style.timelineLine" />
							</div>
							<div :class="$style.timelineContent">
								<div :class="$style.timelineHeader">
									<N8nText :bold="true" size="small">
										<template v-if="period.status === 'published'">
											{{
												period.versionName ??
												i18n.baseText('workflowHistory.publishTimeline.event.activated')
											}}
										</template>
										<template v-else>
											{{ i18n.baseText('workflowHistory.publishTimeline.event.deactivated') }}
										</template>
										<template v-if="period.user">
											<N8nText size="small" color="text-light">
												&middot;
												{{
													i18n.baseText('workflowHistory.publishTimeline.by', {
														interpolate: { user: period.user },
													})
												}}
											</N8nText>
										</template>
									</N8nText>
									<N8nTooltip
										:content="
											period.status === 'published'
												? i18n.baseText('workflowHistory.publishTimeline.activeDuration', {
														interpolate: {
															duration: formatDuration(period.startedAt, period.endedAt),
														},
													})
												: i18n.baseText('workflowHistory.publishTimeline.inactiveDuration', {
														interpolate: {
															duration: formatDuration(period.startedAt, period.endedAt),
														},
													})
										"
									>
										<N8nText size="small" color="text-light">
											{{ formatDate(period.startedAt) }}
										</N8nText>
									</N8nTooltip>
								</div>
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
	max-height: 70vh;
	overflow-y: auto;
}

.disclaimer {
	margin-bottom: var(--spacing--sm);
}

.dismissButton {
	cursor: pointer;
	color: var(--color--text--tint-2);
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 200px;
}

.dotPublished {
	background-color: var(--color--success);
}

.dotPastPublished {
	border: var(--border-width) var(--border-style) var(--color--text--tint-2);
}

.dotUnpublished {
	background-color: var(--color--danger);
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
	flex-grow: 1;
	gap: var(--spacing--5xs);
	padding-bottom: var(--spacing--sm);
}

.timelineHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}
</style>
