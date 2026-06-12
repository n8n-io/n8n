<script setup lang="ts">
import { N8nButton, N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import MiniSpinner from '../components/MiniSpinner.vue';
import StatusCycleText from '../components/StatusCycleText.vue';
import RecommendationCard from '../components/RecommendationCard.vue';
import TaskCard from '../components/TaskCard.vue';

import { usePendingTasks } from '../assistant/use-pending-tasks';
import type { TaskCardVariant } from '../assistant/use-assistant-screen';
import { useAssistantScreen } from '../assistant/use-assistant-screen';
import { useRecommendations } from '../assistant/use-recommendations';
import { filterSections, hasAnyMatch } from '../assistant/use-task-search';
import type { DesktopAssistantTaskCard, DesktopAssistantTasksResponse } from '../../shared/types';

const i18n = useI18n();
const pendingTasks = usePendingTasks();

const props = withDefaults(defineProps<{ query?: string }>(), { query: '' });

const emit = defineEmits<{ executed: []; 'run-prompt': [prompt: string] }>();

// Recommendations: shown as the empty-state content when there are no tasks, and
// as a smaller section below the list when there are. Regenerated as the
// selected context changes (see use-recommendations).
const {
	recommendations,
	loading: recsLoading,
	start: startRecommendations,
	stop: stopRecommendations,
} = useRecommendations();

/** How many suggestions to show: more when it's the whole empty state, fewer
 *  when it's a secondary section under an existing task list. */
const RECOMMENDED_COUNT_EMPTY = 5;
const RECOMMENDED_COUNT_WITH_TASKS = 3;

// True once we have recommendations to show or are generating them. When empty
// and this is false (error/no results) we fall back to the "No tasks yet" text.
const showRecommendations = computed(() => recsLoading.value || recommendations.value.length > 0);

const tasks = ref<DesktopAssistantTasksResponse | null>(null);
const loading = ref(true);
const error = ref(false);

const sections = computed(() => ({
	actionNeeded: tasks.value?.actionNeeded ?? [],
	upcoming: tasks.value?.upcoming ?? [],
	readyToRun: tasks.value?.readyToRun ?? [],
}));

const hasPending = computed(() => pendingTasks.entries.length > 0);

/** Client-side filter over the loaded tasks; active only when the field has text. */
const hasQuery = computed(() => props.query.trim().length > 0);
const filteredSections = computed(() => filterSections(sections.value, props.query));
const hasMatches = computed(() => hasAnyMatch(filteredSections.value));

const isEmpty = computed(
	() =>
		tasks.value !== null &&
		!hasPending.value &&
		!sections.value.actionNeeded.length &&
		!sections.value.upcoming.length &&
		!sections.value.readyToRun.length,
);

/** Suggestion count for the current layout — set once the task list is loaded. */
const recommendedCount = computed(() =>
	isEmpty.value ? RECOMMENDED_COUNT_EMPTY : RECOMMENDED_COUNT_WITH_TASKS,
);

async function load() {
	loading.value = true;
	error.value = false;
	try {
		tasks.value = await window.electronAPI.getTasks();
	} catch (e) {
		// Surface the cause in devtools — the inline state only shows a generic message.
		console.error('Failed to load desktop-assistant tasks', e);
		error.value = true;
	} finally {
		loading.value = false;
	}
}

const { goTo } = useAssistantScreen();

/** Clicking a card opens the in-app detail view (the browser handoff lives
 *  there, behind "View in n8n"). */
function openDetail(card: DesktopAssistantTaskCard, variant: TaskCardVariant) {
	goTo({ name: 'task-detail', card, variant });
}

async function runTask(workflowId: string) {
	const result = await window.electronAPI.runTask(workflowId);
	if (result.ok) {
		// Hand off to the History tab so the user watches the run progress (spinner
		// → done/failed). Reloading the task list here is moot since we're leaving.
		emit('executed');
		return;
	}
	// On failure, stay put and refresh the list so it reflects current state.
	await load();
}

/** A recommendation card was clicked — fire it through the composer's one-shot path. */
function runRecommendation(prompt: string) {
	emit('run-prompt', prompt);
}

// When a promotion completes the saved workflow becomes a real task; refetch
// so it replaces the pending card.
let unsubscribeSaved: (() => void) | undefined;

onMounted(async () => {
	unsubscribeSaved = pendingTasks.onSaved(() => void load());
	await load();
	// Generate recommendations whether the list is empty or not; the count differs
	// (see recommendedCount). Skipped only if the task load itself failed.
	if (!error.value) void startRecommendations(recommendedCount.value);
});
onBeforeUnmount(() => {
	stopRecommendations();
	unsubscribeSaved?.();
});
</script>

<template>
	<div :class="$style.view">
		<!-- Tasks being promoted into saved workflows; live so status flips announce. -->
		<section v-if="hasPending" :class="$style.section" aria-live="polite">
			<div
				v-for="entry in pendingTasks.entries"
				:key="entry.threadId"
				:class="$style.pendingCard"
				data-testid="pending-task-card"
			>
				<span
					:class="[
						$style.pendingTile,
						entry.status === 'failed' ? $style.pendingTileFailed : $style.pendingTileBuilding,
					]"
					aria-hidden="true"
				>
					<MiniSpinner v-if="entry.status === 'building'" />
					<N8nIcon v-else icon="triangle-alert" :size="15" />
				</span>
				<span :class="$style.pendingBody">
					<span :class="$style.pendingTitle">{{ entry.label }}</span>
					<span
						:class="[
							$style.pendingSubtitle,
							{ [$style.pendingSubtitleFailed]: entry.status === 'failed' },
						]"
					>
						<StatusCycleText
							v-if="entry.status === 'building'"
							lead-key="desktopAssistant.tasks.settingUp"
						/>
						<template v-else>{{
							entry.error ?? i18n.baseText('desktopAssistant.tasks.setupFailed')
						}}</template>
					</span>
				</span>
				<button
					v-if="entry.status === 'failed'"
					type="button"
					:class="$style.pendingDismiss"
					:aria-label="i18n.baseText('desktopAssistant.tasks.dismiss')"
					@click="pendingTasks.dismiss(entry.threadId)"
				>
					<N8nIcon icon="x" :size="14" aria-hidden="true" />
				</button>
			</div>
		</section>

		<div v-if="loading" :class="$style.state" role="status" aria-live="polite">
			<N8nSpinner aria-hidden="true" />
			<N8nText color="text-light" size="small">{{
				i18n.baseText('desktopAssistant.tasks.loading')
			}}</N8nText>
		</div>

		<div v-else-if="error" :class="$style.state" role="alert">
			<N8nText color="text-light" size="small">{{
				i18n.baseText('desktopAssistant.tasks.error')
			}}</N8nText>
			<N8nButton variant="outline" size="small" @click="load">{{
				i18n.baseText('desktopAssistant.tasks.retry')
			}}</N8nButton>
		</div>

		<template v-else-if="tasks">
			<section v-if="filteredSections.actionNeeded.length" :class="$style.section">
				<TaskCard
					v-for="card in filteredSections.actionNeeded"
					:key="card.workflowId"
					:card="card"
					variant="actionNeeded"
					@open="openDetail(card, 'actionNeeded')"
					@run="runTask"
				/>
			</section>

			<section v-if="filteredSections.upcoming.length" :class="$style.section">
				<N8nText :class="$style.sectionTitle">{{
					i18n.baseText('desktopAssistant.sections.upcoming')
				}}</N8nText>
				<TaskCard
					v-for="card in filteredSections.upcoming"
					:key="card.workflowId"
					:card="card"
					variant="upcoming"
					@open="openDetail(card, 'upcoming')"
					@run="runTask"
				/>
			</section>

			<section v-if="filteredSections.readyToRun.length" :class="$style.section">
				<N8nText :class="$style.sectionTitle">{{
					i18n.baseText('desktopAssistant.sections.readyToRun')
				}}</N8nText>
				<TaskCard
					v-for="card in filteredSections.readyToRun"
					:key="card.workflowId"
					:card="card"
					variant="readyToRun"
					@open="openDetail(card, 'readyToRun')"
					@run="runTask"
				/>
			</section>

			<!-- Searching with no hits: a dedicated empty state, no recommendations. -->
			<div v-if="hasQuery && !hasMatches" :class="$style.state" role="status" aria-live="polite">
				<N8nText color="text-light" size="small">{{
					i18n.baseText('desktopAssistant.search.noMatches', { interpolate: { query } })
				}}</N8nText>
			</div>

			<!-- Recommendations: the whole content when the list is empty, or a
				 smaller section below the tasks when there are some. Hidden while
				 searching — they're an empty-state aid, not search results. -->
			<section
				v-else-if="!hasQuery && showRecommendations"
				:class="[$style.section, $style.recommendations]"
			>
				<N8nText :class="$style.sectionTitle">{{
					i18n.baseText('desktopAssistant.sections.recommended')
				}}</N8nText>

				<template v-if="recsLoading">
					<div
						v-for="n in recommendedCount"
						:key="n"
						:class="$style.skeletonCard"
						role="status"
						aria-live="polite"
						:aria-label="i18n.baseText('desktopAssistant.tasks.loading')"
					>
						<span :class="$style.skeletonTile" aria-hidden="true" />
						<span :class="$style.skeletonBody" aria-hidden="true">
							<span :class="$style.skeletonLine" />
							<span :class="[$style.skeletonLine, $style.skeletonLineShort]" />
						</span>
					</div>
				</template>

				<RecommendationCard
					v-for="(rec, index) in recommendations"
					v-else
					:key="index"
					:recommendation="rec"
					@run="runRecommendation"
				/>
			</section>

			<!-- Only when the list is genuinely empty and no suggestions are available. -->
			<div v-else-if="isEmpty" :class="$style.state">
				<N8nText color="text-light" size="small">{{
					i18n.baseText('desktopAssistant.tasks.empty')
				}}</N8nText>
			</div>
		</template>
	</div>
</template>

<style module>
.view {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--2xs);
}

.section {
	display: flex;
	flex-direction: column;
}

/* Suggestion cards are dashed/standalone (unlike the flush real-task rows), so
   give them a little breathing room between rows. */
.recommendations {
	gap: var(--spacing--2xs);
}

/* Scoped under `.section` so font-size/weight win over N8nText's own size/weight
   classes (2 classes vs 1); color/transform/spacing have no N8nText equivalent. */
.section .sectionTitle {
	padding: 10px var(--spacing--2xs) var(--spacing--4xs);
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.8px;
	color: var(--da-subtlest);
}

/* Pending card mirrors TaskCard's row layout, but isn't interactive. */
.pendingCard {
	display: flex;
	align-items: center;
	gap: 11px;
	width: 100%;
	padding: 10px var(--spacing--2xs);
	color: var(--da-text);
	border-radius: var(--radius--xs);
}

.pendingTile {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 34px;
	height: 34px;
	border-radius: var(--radius--xs);
	border: 1px solid var(--da-border);
}

.pendingTileBuilding {
	background: rgba(122, 162, 255, 0.14);
	color: var(--da-blue);
}

.pendingTileFailed {
	background: rgba(255, 107, 107, 0.14);
	color: var(--da-red);
}

.pendingBody {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

/* The DS reset sets body line-height to 1, which together with overflow:hidden
   clips descenders ("g", "y"). --line-height--md (1.3) gives them room while
   keeping the row shorter than the 34px tile, so card height is unchanged. */
.pendingTitle {
	font-size: 13px;
	font-weight: 500;
	line-height: var(--line-height--md);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pendingSubtitle {
	margin-top: var(--spacing--5xs);
	font-size: 11px;
	line-height: var(--line-height--md);
	color: var(--da-subtler);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pendingSubtitleFailed {
	color: var(--da-red);
}

.pendingDismiss {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	color: var(--da-subtler);
	cursor: pointer;
	background: none;
	border: none;
	border-radius: 7px;
	transition:
		background 0.12s,
		color 0.12s;
}

.pendingDismiss:hover {
	color: var(--da-text);
	background: var(--da-surface-2);
}

.pendingDismiss:focus-visible {
	color: var(--da-text);
	background: var(--da-surface-2);
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--md);
}

/* Skeleton placeholder while recommendations generate — same footprint as a
   RecommendationCard so the list doesn't jump when real cards arrive. */
.skeletonCard {
	display: flex;
	align-items: center;
	gap: 11px;
	width: 100%;
	padding: 10px var(--spacing--2xs);
	border: 1px dashed var(--da-border);
	border-radius: var(--radius--xs);
	animation: skeletonPulse 1.2s ease-in-out infinite;
}

.skeletonTile {
	flex-shrink: 0;
	width: 34px;
	height: 34px;
	border-radius: var(--radius--xs);
	background: var(--da-surface-2);
}

.skeletonBody {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
}

.skeletonLine {
	width: 70%;
	height: 9px;
	border-radius: var(--radius--full);
	background: var(--da-surface-2);
}

.skeletonLineShort {
	width: 45%;
}

@keyframes skeletonPulse {
	0%,
	100% {
		opacity: 0.45;
	}

	50% {
		opacity: 0.7;
	}
}
</style>
