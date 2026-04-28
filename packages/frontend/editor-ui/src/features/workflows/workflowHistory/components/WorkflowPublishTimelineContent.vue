<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import dateformat from 'dateformat';
import { useI18n } from '@n8n/i18n';
import { N8nText, N8nLoading, N8nIcon, N8nTooltip } from '@n8n/design-system';
import type { PublishTimelineEvent } from '@n8n/rest-api-client/api/workflowHistory';
import { useWorkflowHistoryStore } from '../workflowHistory.store';

/** Brief unpublished gaps shorter than this are version-change artefacts, not real deactivations */
const TRANSIENT_DEACTIVATION_MS = 2000;
/** Active/inactive duration is shown on entries only when the period lasted at least this long */
const MIN_DURATION_FOR_LABEL_MS = 10 * 60 * 1000;
/** Adoption point for publish-timeline tracking — older events may be incomplete */
const ADOPTION_VERSION = { major: 2, minor: 17, patch: 0 } as const;

const props = defineProps<{
	workflowId: string;
	selectedVersionId?: string;
}>();

const emit = defineEmits<{
	selectVersion: [versionId: string];
}>();

const i18n = useI18n();
const workflowHistoryStore = useWorkflowHistoryStore();

const isLoading = ref(true);
const events = ref<PublishTimelineEvent[]>([]);
const adoptionDate = ref<Date | null>(null);

type EntryStatus = 'published' | 'unpublished';

type TimelineEntry = {
	status: EntryStatus;
	startedAt: Date;
	endedAt: Date | null;
	versionId: string | null;
	user: string | null;
	isLatest: boolean;
	isClickable: boolean;
	isSelected: boolean;
	isDeletedVersion: boolean;
	hasDuration: boolean;
	title: string;
	durationLabel: string;
	shortDate: string;
	fullDate: string;
};

// ---- formatters --------------------------------------------------------

const isToday = (date: Date) => {
	const now = new Date();
	return (
		date.getDate() === now.getDate() &&
		date.getMonth() === now.getMonth() &&
		date.getFullYear() === now.getFullYear()
	);
};

const formatShortDate = (date: Date) => {
	if (isToday(date)) return dateformat(date, 'HH:MM');
	const format = date.getFullYear() !== new Date().getFullYear() ? 'd mmm yyyy' : 'd mmm';
	return dateformat(date, format);
};

const formatFullDate = (date: Date) => dateformat(date, 'mmm d, yyyy HH:MM:ss');

const formatDuration = (start: Date, end: Date | null) => {
	const ms = (end ?? new Date()).getTime() - start.getTime();
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) {
		const remMin = minutes % 60;
		return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
	}
	if (minutes > 0) return `${minutes}m`;
	return `${seconds}s`;
};

// ---- entry construction ------------------------------------------------

const titleFor = (event: PublishTimelineEvent): string => {
	if (event.event === 'deactivated') {
		return i18n.baseText('workflowHistory.publishTimeline.event.deactivated');
	}
	if (!event.versionId) {
		return i18n.baseText('workflowHistory.publishTimeline.event.activatedDeletedVersion');
	}
	if (event.versionName) {
		return i18n.baseText('workflowHistory.publishTimeline.event.activatedVersion', {
			interpolate: { version: event.versionName },
		});
	}
	return i18n.baseText('workflowHistory.publishTimeline.event.activated');
};

const buildEntry = (
	event: PublishTimelineEvent,
	next: PublishTimelineEvent | undefined,
): TimelineEntry => {
	const status: EntryStatus = event.event === 'activated' ? 'published' : 'unpublished';
	const startedAt = new Date(event.createdAt);
	const endedAt = next ? new Date(next.createdAt) : null;
	const durationMs = (endedAt ?? new Date()).getTime() - startedAt.getTime();
	const versionId = status === 'published' ? event.versionId : null;
	const durationKey =
		status === 'published'
			? 'workflowHistory.publishTimeline.activeDuration'
			: 'workflowHistory.publishTimeline.inactiveDuration';

	return {
		status,
		startedAt,
		endedAt,
		versionId,
		user: event.user ? `${event.user.firstName} ${event.user.lastName}` : null,
		isLatest: !next,
		isClickable: status === 'published' && !!versionId,
		isSelected: !!versionId && versionId === props.selectedVersionId,
		isDeletedVersion: status === 'published' && !versionId,
		hasDuration: durationMs >= MIN_DURATION_FOR_LABEL_MS,
		title: titleFor(event),
		durationLabel: i18n.baseText(durationKey, {
			interpolate: { duration: formatDuration(startedAt, endedAt) },
		}),
		shortDate: formatShortDate(startedAt),
		fullDate: formatFullDate(startedAt),
	};
};

const isMeaningfulEntry = (entry: TimelineEntry) => {
	if (entry.status !== 'unpublished' || entry.endedAt === null) return true;
	return entry.endedAt.getTime() - entry.startedAt.getTime() >= TRANSIENT_DEACTIVATION_MS;
};

// ---- computed ----------------------------------------------------------

const entries = computed<TimelineEntry[]>(() =>
	events.value
		.map((event, idx) => buildEntry(event, events.value[idx + 1]))
		.toReversed()
		.filter(isMeaningfulEntry),
);

const showDeletedVersionsDisclaimer = computed(() => {
	if (adoptionDate.value === null) return false;
	const adoptionTime = adoptionDate.value.getTime();
	return events.value.some((e) => new Date(e.createdAt).getTime() < adoptionTime);
});

const adoptionShortDate = computed(() =>
	adoptionDate.value ? formatShortDate(adoptionDate.value) : '',
);

// ---- actions -----------------------------------------------------------

const handleSelect = (entry: TimelineEntry) => {
	if (entry.versionId) emit('selectVersion', entry.versionId);
};

const loadTimeline = async () => {
	isLoading.value = true;
	try {
		const [timelineEvents, firstAdoptionDate] = await Promise.all([
			workflowHistoryStore.getPublishTimeline(props.workflowId),
			workflowHistoryStore.getVersionFirstAdoptionDate(ADOPTION_VERSION).catch(() => null),
		]);
		adoptionDate.value = firstAdoptionDate ? new Date(firstAdoptionDate) : null;
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
		<div v-else-if="entries.length === 0" :class="$style.empty">
			<N8nText>{{ i18n.baseText('workflowHistory.publishTimeline.empty') }}</N8nText>
		</div>
		<template v-else>
			<div :class="$style.timeline">
				<div
					v-for="(entry, idx) in entries"
					:key="idx"
					:class="[
						$style.timelineItem,
						entry.isClickable && $style.timelineItemClickable,
						entry.isSelected && $style.timelineItemSelected,
						entry.hasDuration && $style.timelineItemTall,
					]"
					:role="entry.isClickable ? 'button' : undefined"
					:tabindex="entry.isClickable ? 0 : undefined"
					@click="entry.isClickable && handleSelect(entry)"
					@keydown.enter="entry.isClickable && handleSelect(entry)"
					@keydown.space.prevent="entry.isClickable && handleSelect(entry)"
				>
					<div :class="$style.timelineIndicator">
						<span
							:class="[
								$style.timelineLine,
								idx === 0 && entry.status !== 'published' && $style.timelineLineHidden,
							]"
						/>
						<span v-if="entry.status === 'unpublished'" :class="$style.timelineMarker">
							<N8nIcon icon="x" size="small" />
						</span>
						<span
							v-else
							:class="[
								$style.timelineDot,
								entry.isLatest ? $style.dotPublished : $style.dotPastPublished,
							]"
						/>
						<span
							:class="[
								$style.timelineLine,
								idx === entries.length - 1 && $style.timelineLineHidden,
							]"
						/>
					</div>
					<div :class="$style.timelineContent">
						<div :class="$style.durationRow">
							<template v-if="entry.hasDuration">
								<N8nIcon icon="clock" size="small" />
								<N8nText size="xsmall" color="text-light">
									{{ entry.durationLabel }}
								</N8nText>
							</template>
						</div>
						<div :class="$style.timelineHeader">
							<N8nText :bold="true" size="small" :class="$style.timelineTitle">
								{{ entry.title }}
								<N8nTooltip
									v-if="entry.isDeletedVersion"
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
							<N8nTooltip placement="left" :content="entry.fullDate">
								<N8nText size="small" color="text-light" :class="$style.dateText">
									{{ entry.shortDate }}
								</N8nText>
							</N8nTooltip>
						</div>
						<div :class="$style.userText">
							<N8nText size="xsmall" color="text-light">
								{{ entry.user }}
							</N8nText>
						</div>
					</div>
				</div>
			</div>
			<N8nTooltip
				v-if="showDeletedVersionsDisclaimer"
				placement="top"
				:content="
					i18n.baseText('workflowHistory.publishTimeline.deletedVersionsDisclaimer.tooltip')
				"
			>
				<N8nText size="small" color="text-light" :class="$style.deletedVersionsDisclaimer">
					{{
						i18n.baseText('workflowHistory.publishTimeline.deletedVersionsDisclaimer', {
							interpolate: { date: adoptionShortDate },
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

.empty {
	display: flex;
	place-content: center;
	min-height: 200px;
}

.timeline {
	display: flex;
	flex-direction: column;
}

.timelineItem {
	display: flex;
	gap: var(--spacing--2xs);
	margin: var(--spacing--4xs);
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	height: 60px;

	&.timelineItemTall {
		height: 80px;
	}

	&.timelineItemClickable {
		cursor: pointer;

		&:hover,
		&:focus-visible {
			background-color: var(--color--background--light-1);
			outline: none;
		}
	}

	&.timelineItemSelected {
		background-color: var(--color--background--light-1);
	}
}

.timelineIndicator {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex-shrink: 0;
	width: 13px;
}

.timelineDot {
	width: 11px;
	height: 11px;
	border-radius: 50%;
	flex-shrink: 0;
}

.dotPublished {
	background-color: var(--color--success);
}

.dotPastPublished {
	border: var(--border-width) solid var(--color--text--tint-2);
}

.timelineMarker {
	display: flex;
	place-content: center;
	width: 13px;
	height: 13px;
	flex-shrink: 0;
	color: var(--color--warning);
}

.timelineLine {
	flex: 1;
	width: 1px;
	min-height: var(--spacing--2xs);
	background-color: var(--color--foreground);

	&.timelineLineHidden {
		visibility: hidden;
	}
}

.timelineContent {
	display: flex;
	flex-direction: column;
	justify-content: center;
	flex-grow: 1;
	min-width: 0;
}

.timelineHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.timelineTitle {
	display: block;
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.deletedVersionHint {
	margin-left: var(--spacing--4xs);
	vertical-align: middle;
	color: var(--color--text--tint-2);
}

.dateText {
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.durationRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-height: var(--spacing--xs);
	color: var(--color--text--tint-2);
	padding-bottom: var(--spacing--2xs);
}

.userText {
	min-height: var(--spacing--xs);
}

.deletedVersionsDisclaimer {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm) 0;
}
</style>
