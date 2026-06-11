<script setup lang="ts">
import { N8nButton, N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import MiniSpinner from '../components/MiniSpinner.vue';
import TaskCard from '../components/TaskCard.vue';

import { usePendingTasks } from '../assistant/use-pending-tasks';

import type { DesktopAssistantTasksResponse } from '../../shared/types';

const i18n = useI18n();
const pendingTasks = usePendingTasks();

const emit = defineEmits<{ executed: [] }>();

const tasks = ref<DesktopAssistantTasksResponse | null>(null);
const loading = ref(true);
const error = ref(false);

const sections = computed(() => ({
	actionNeeded: tasks.value?.actionNeeded ?? [],
	upcoming: tasks.value?.upcoming ?? [],
	readyToRun: tasks.value?.readyToRun ?? [],
}));

const hasPending = computed(() => pendingTasks.entries.length > 0);

// Pending (being-set-up) entries count as content, so they suppress the empty state.
const isEmpty = computed(
	() =>
		tasks.value !== null &&
		!hasPending.value &&
		!sections.value.actionNeeded.length &&
		!sections.value.upcoming.length &&
		!sections.value.readyToRun.length,
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

function openWorkflow(workflowId: string) {
	void window.electronAPI.openWorkflow(workflowId);
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

// When a pending promotion completes, the saved workflow becomes a real task —
// refetch so it appears in its bucket as the pending card disappears.
let unsubscribeSaved: (() => void) | undefined;

onMounted(() => {
	void load();
	unsubscribeSaved = pendingTasks.onSaved(() => void load());
});

onUnmounted(() => {
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
						:class="[$style.pendingSubtitle, { [$style.pendingSubtitleFailed]: entry.status === 'failed' }]"
					>
						{{
							entry.status === 'building'
								? i18n.baseText('desktopAssistant.tasks.settingUp')
								: (entry.error ?? i18n.baseText('desktopAssistant.tasks.setupFailed'))
						}}
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

		<div v-else-if="isEmpty" :class="$style.state">
			<N8nText color="text-light" size="small">{{
				i18n.baseText('desktopAssistant.tasks.empty')
			}}</N8nText>
		</div>

		<template v-else-if="tasks">
			<section v-if="sections.actionNeeded.length" :class="$style.section">
				<TaskCard
					v-for="card in sections.actionNeeded"
					:key="card.workflowId"
					:card="card"
					variant="actionNeeded"
					@open="openWorkflow"
					@run="runTask"
				/>
			</section>

			<section v-if="sections.upcoming.length" :class="$style.section">
				<N8nText :class="$style.sectionTitle">{{
					i18n.baseText('desktopAssistant.sections.upcoming')
				}}</N8nText>
				<TaskCard
					v-for="card in sections.upcoming"
					:key="card.workflowId"
					:card="card"
					variant="upcoming"
					@open="openWorkflow"
					@run="runTask"
				/>
			</section>

			<section v-if="sections.readyToRun.length" :class="$style.section">
				<N8nText :class="$style.sectionTitle">{{
					i18n.baseText('desktopAssistant.sections.readyToRun')
				}}</N8nText>
				<TaskCard
					v-for="card in sections.readyToRun"
					:key="card.workflowId"
					:card="card"
					variant="readyToRun"
					@open="openWorkflow"
					@run="runTask"
				/>
			</section>
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

.pendingTitle {
	font-size: 13px;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pendingSubtitle {
	margin-top: var(--spacing--5xs);
	font-size: 11px;
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
</style>
