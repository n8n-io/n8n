<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nText, N8nLoading, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useWorkflowHistoryStore } from '../workflowHistory.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { PublishTimelineEvent } from '@n8n/rest-api-client/api/workflowHistory';
import dateformat from 'dateformat';

const emit = defineEmits<{
	selectVersion: [versionId: string];
}>();

/** Threshold to filter out transient deactivation/reactivation gaps during version changes */
const MIN_UNPUBLISHED_DURATION_MS = 2000;
/** Show the active/inactive duration on an entry only when the period lasted longer than this */
const MIN_DURATION_FOR_LABEL_MS = 10 * 60 * 1000;

const props = defineProps<{
	workflowId: string;
}>();

const i18n = useI18n();
const workflowHistoryStore = useWorkflowHistoryStore();
const usersStore = useUsersStore();

const isLoading = ref(true);
const events = ref<PublishTimelineEvent[]>([]);
const adoptionDate = ref<Date | null>(null);

const hasMultipleAuthors = computed(
	() => usersStore.allUsers.filter((user) => !user.isPendingUser).length > 1,
);

const showDeletedVersionsDisclaimer = computed(() => {
	if (adoptionDate.value === null) return false;

	const adoptionTime = adoptionDate.value.getTime();
	return events.value.some((e) => new Date(e.createdAt).getTime() < adoptionTime);
});

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
			versionName: isActivated ? (event.versionName ?? null) : null,
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

const shouldShowDuration = (period: TimelinePeriod) =>
	getDurationMs(period) >= MIN_DURATION_FOR_LABEL_MS;

const isClickable = (period: TimelinePeriod) => period.status === 'published' && !!period.versionId;

const onSelect = (period: TimelinePeriod) => {
	if (period.versionId) emit('selectVersion', period.versionId);
};

const loadTimeline = async () => {
	isLoading.value = true;
	try {
		const [timelineEvents, firstAdoptionDate] = await Promise.all([
			workflowHistoryStore.getPublishTimeline(props.workflowId),
			workflowHistoryStore
				.getVersionFirstAdoptionDate({ major: 2, minor: 17, patch: 0 })
				.catch(() => null),
			// ensure usersStore is sufficiently initialized for `hasMultipleAuthors`
			usersStore.fetchUsers({ filter: { isPending: false }, take: 2 }),
		]);
		adoptionDate.value = firstAdoptionDate === null ? null : new Date(firstAdoptionDate);
		events.value = timelineEvents;
	} finally {
		isLoading.value = false;
	}
};

onMounted(loadTimeline);
</script>

<template>
	<div :class="$style.content">
		<N8nLoading v-if="isLoading" :rows="4" />
		<div v-else-if="periods.length === 0" :class="$style.empty">
			<N8nText>{{ i18n.baseText('workflowHistory.publishTimeline.empty') }}</N8nText>
		</div>
		<template v-else>
			<div :class="$style.timeline">
				<div
					v-for="(period, idx) in periods"
					:key="idx"
					:class="[
						$style.timelineItem,
						isClickable(period) && $style.timelineItemClickable,
						shouldShowDuration(period) && $style.timelineItemTall,
					]"
					:role="isClickable(period) ? 'button' : undefined"
					:tabindex="isClickable(period) ? 0 : undefined"
					@click="isClickable(period) && onSelect(period)"
					@keydown.enter="isClickable(period) && onSelect(period)"
					@keydown.space.prevent="isClickable(period) && onSelect(period)"
				>
					<div :class="$style.timelineIndicator">
						<span
							:class="[
								$style.timelineLine,
								idx === 0 && period.status !== 'published' && $style.timelineLineHidden,
							]"
						/>
						<span
							v-if="period.status === 'unpublished'"
							:class="[$style.timelineMarker, $style.markerUnpublished]"
						>
							<N8nIcon icon="x" size="small" />
						</span>
						<span
							v-else
							:class="[
								$style.timelineDot,
								period.isCurrent ? $style.dotPublished : $style.dotPastPublished,
							]"
						/>
						<span
							:class="[
								$style.timelineLine,
								idx === periods.length - 1 && $style.timelineLineHidden,
							]"
						/>
					</div>
					<div :class="$style.timelineContent">
						<div :class="$style.durationRow">
							<template v-if="shouldShowDuration(period)">
								<N8nIcon icon="clock" size="small" />
								<N8nText size="xsmall" color="text-light">
									{{ period.durationText }}
								</N8nText>
							</template>
						</div>
						<div :class="$style.timelineHeader">
							<N8nText :bold="true" size="small" :class="$style.timelineTitle">
								<template v-if="period.status === 'published'">
									{{
										period.versionId
											? period.versionName
												? i18n.baseText('workflowHistory.publishTimeline.event.activatedVersion', {
														interpolate: { version: period.versionName },
													})
												: i18n.baseText('workflowHistory.publishTimeline.event.activated')
											: i18n.baseText(
													'workflowHistory.publishTimeline.event.activatedDeletedVersion',
												)
									}}
								</template>
								<template v-else>
									{{ i18n.baseText('workflowHistory.publishTimeline.event.deactivated') }}
								</template>
								<N8nTooltip
									v-if="period.status === 'published' && !period.versionId"
									placement="top"
									:content="
										i18n.baseText(
											'workflowHistory.publishTimeline.event.activatedDeletedVersion.tooltip',
										)
									"
								>
									<N8nIcon icon="info" size="small" :class="$style.deletedVersionHint" />
								</N8nTooltip>
							</N8nText>
							<N8nTooltip placement="left" :content="formatDateFull(period.startedAt)">
								<N8nText size="small" color="text-light" :class="$style.dateText">
									{{ formatDateShort(period.startedAt) }}
								</N8nText>
							</N8nTooltip>
						</div>
						<div :class="$style.userText">
							<N8nText size="xsmall" color="text-light">
								{{ period.user }}
							</N8nText>
						</div>
					</div>
				</div>
			</div>
			<N8nTooltip
				v-if="adoptionDate && showDeletedVersionsDisclaimer"
				placement="top"
				:content="
					i18n.baseText('workflowHistory.publishTimeline.deletedVersionsDisclaimer.tooltip')
				"
			>
				<N8nText size="small" color="text-light" :class="$style.deletedVersionsDisclaimer">
					{{
						i18n.baseText('workflowHistory.publishTimeline.deletedVersionsDisclaimer', {
							interpolate: {
								date: formatDateShort(adoptionDate),
							},
						})
					}}
					<N8nIcon icon="info" size="small" />
				</N8nText>
			</N8nTooltip>
		</template>
	</div>
</template>

<style module lang="scss">
.content {
	padding: var(--spacing--2xs);
	overflow-y: auto;
	height: 100%;
}

.deletedVersionHint {
	color: var(--color--text--tint-2);
	margin-left: var(--spacing--4xs);
	vertical-align: middle;
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 200px;
}

.timeline {
	display: flex;
	flex-direction: column;
}

.timelineItem {
	display: flex;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xs);
	border-radius: var(--radius);
	box-sizing: border-box;
	height: 61px;
}

.timelineItemTall {
	height: 81px;
}

.timelineItemClickable {
	cursor: pointer;

	&:hover,
	&:focus-visible {
		background-color: var(--color--background--light-2);
		outline: none;
	}
}

.timelineIndicator {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 13px;
	flex-shrink: 0;
}

.timelineDot {
	display: inline-block;
	width: 11px;
	height: 11px;
	border-radius: 50%;
	flex-shrink: 0;
}

.dotPublished {
	background-color: var(--color--success);
}

.dotPastPublished {
	border: var(--border-width) var(--border-style) var(--color--text--tint-2);
}

.timelineMarker {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 13px;
	height: 13px;
	flex-shrink: 0;
}

.markerUnpublished {
	color: var(--color--warning);
}

.timelineLine {
	width: 1px;
	flex: 1 1 0;
	min-height: var(--spacing--2xs);
	background-color: var(--color--foreground);
}

.timelineLineHidden {
	visibility: hidden;
}

.timelineContent {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	min-width: 0;
	justify-content: center;
	gap: var(--spacing--5xs);
}

.timelineHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.timelineTitle {
	display: block;
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.userText {
	display: block;
	min-height: var(--spacing--xs);
	line-height: var(--spacing--xs);
}

.dateText {
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.durationRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--color--text--tint-2);
	min-height: var(--spacing--xs);
}

.deletedVersionsDisclaimer {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm) 0;
	width: 100%;
	justify-content: center;
}
</style>
