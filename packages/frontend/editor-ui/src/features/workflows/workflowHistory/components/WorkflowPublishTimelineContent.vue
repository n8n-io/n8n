<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nText, N8nLoading, N8nIcon, N8nCallout, N8nTooltip } from '@n8n/design-system';
import { useWorkflowHistoryStore } from '../workflowHistory.store';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import type { PublishTimelineEvent } from '@n8n/rest-api-client/api/workflowHistory';
import dateformat from 'dateformat';

const emit = defineEmits<{
	selectVersion: [versionId: string];
}>();

const DOWNTIME_DISCLAIMER_CALLOUT = 'publishTimelineDowntimeDisclaimer';
/** Threshold to filter out transient deactivation/reactivation gaps during version changes */
const MIN_UNPUBLISHED_DURATION_MS = 2000;
/** Show a duration badge between entries when the period lasted longer than this */
const MIN_DURATION_FOR_BADGE_MS = 10 * 60 * 1000;

const props = defineProps<{
	workflowId: string;
}>();

const i18n = useI18n();
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
	durationText: string;
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
		return `${days}d ${remainingHours}h`;
	}
	if (hours > 0) {
		const remainingMinutes = minutes % 60;
		return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
	}
	if (minutes > 0) return `${minutes}m`;
	return `${seconds}s`;
};

const periods = computed<TimelinePeriod[]>(() => {
	if (events.value.length === 0) return [];

	const result: TimelinePeriod[] = [];

	for (let idx = 0; idx < events.value.length; idx++) {
		const event = events.value[idx];
		const nextEvent = events.value[idx + 1];
		const isActivated = event.event === 'activated';

		const startedAt = new Date(event.createdAt);
		const endedAt = nextEvent ? new Date(nextEvent.createdAt) : null;

		const durationText = i18n.baseText(
			isActivated
				? 'workflowHistory.publishTimeline.activeDuration'
				: 'workflowHistory.publishTimeline.inactiveDuration',
			{
				interpolate: {
					duration: formatDuration(startedAt, endedAt),
				},
			},
		);

		result.push({
			status: isActivated ? 'published' : 'unpublished',
			startedAt,
			endedAt,
			durationText,
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

const isToday = (date: Date) => {
	const now = new Date();
	return (
		date.getDate() === now.getDate() &&
		date.getMonth() === now.getMonth() &&
		date.getFullYear() === now.getFullYear()
	);
};

const formatDateShort = (date: Date) => {
	if (isToday(date)) return dateformat(date, 'HH:MM');
	const format = date.getFullYear() !== new Date().getFullYear() ? 'd mmm yyyy' : 'd mmm';
	return dateformat(date, format);
};

const formatDateFull = (date: Date) => {
	return dateformat(date, 'mmm d, yyyy HH:MM:ss');
};

const getDurationMs = (period: TimelinePeriod) =>
	(period.endedAt ?? new Date()).getTime() - period.startedAt.getTime();

const shouldShowDurationBadge = (idx: number) =>
	getDurationMs(periods.value[idx]) >= MIN_DURATION_FOR_BADGE_MS;

const loadTimeline = async () => {
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
};

onMounted(loadTimeline);
</script>

<template>
	<div :class="$style.content">
		<N8nCallout
			v-if="!isCalloutDismissed(DOWNTIME_DISCLAIMER_CALLOUT)"
			theme="info"
			:class="$style.disclaimer"
		>
			{{ i18n.baseText('workflowHistory.publishTimeline.downtimeDisclaimer') }}
			<template #trailingContent>
				<N8nIcon
					icon="x"
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
				<template v-for="(period, idx) in periods" :key="idx">
					<div v-if="shouldShowDurationBadge(idx)" :class="$style.durationSeparator">
						<div :class="$style.timelineIndicator">
							<span :class="$style.timelineLine" />
						</div>
						<div :class="$style.durationBadge">
							<N8nIcon icon="clock" size="small" />
							<N8nText size="small" color="text-light">
								{{ period.durationText }}
							</N8nText>
						</div>
					</div>
					<div :class="$style.timelineItem">
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
										<a
											v-if="period.versionId"
											:class="$style.versionLink"
											@click="emit('selectVersion', period.versionId)"
										>
											{{
												period.versionName
													? i18n.baseText(
															'workflowHistory.publishTimeline.event.activatedVersion',
															{ interpolate: { version: period.versionName } },
														)
													: i18n.baseText('workflowHistory.publishTimeline.event.activated')
											}}
										</a>
										<template v-else>
											{{ i18n.baseText('workflowHistory.publishTimeline.event.activated') }}
										</template>
									</template>
									<template v-else>
										{{ i18n.baseText('workflowHistory.publishTimeline.event.deactivated') }}
									</template>
									<template v-if="period.user">
										{{ ' ' }}
										<N8nText size="small" color="text-light">
											{{
												i18n.baseText('workflowHistory.publishTimeline.by', {
													interpolate: { user: period.user },
												})
											}}
										</N8nText>
									</template>
								</N8nText>
								<N8nTooltip placement="left" :content="formatDateFull(period.startedAt)">
									<N8nText size="small" color="text-light" :class="$style.dateText">
										{{ formatDateShort(period.startedAt) }}
									</N8nText>
								</N8nTooltip>
							</div>
						</div>
					</div>
				</template>
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
.content {
	padding: var(--spacing--sm);
	overflow-y: auto;
	height: 100%;
}

.versionLink {
	cursor: pointer;
	color: inherit;

	&:hover {
		color: var(--color--primary);
	}
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
	border: var(--border-width) var(--border-style) var(--color--danger);
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
	padding-bottom: var(--spacing--md);
}

.timelineHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.dateText {
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.durationSeparator {
	display: flex;
	gap: var(--spacing--xs);
}

.durationBadge {
	display: inline-flex;
	align-self: center;
	align-items: center;
	gap: var(--spacing--4xs);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	width: fit-content;
	margin-bottom: var(--spacing--md);
}
</style>
