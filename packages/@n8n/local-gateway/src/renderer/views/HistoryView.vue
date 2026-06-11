<script setup lang="ts">
import { N8nButton, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import HistoryRow from '../components/HistoryRow.vue';
import TimeSavedPanel from '../components/TimeSavedPanel.vue';

import type { DesktopAssistantHistoryEntry, DesktopAssistantTimeSaved } from '../../shared/types';

/** Refresh cadence while the History tab is open; a running execution flips to its final state. */
const POLL_INTERVAL_MS = 5000;
const PAGE_SIZE = 20;
/** Backend clamps history to 100 rows per request. */
const MAX_PAGE_SIZE = 100;

const i18n = useI18n();

const entries = ref<DesktopAssistantHistoryEntry[]>([]);
const count = ref(0);
const now = ref(Date.now());
const timeSaved = ref<DesktopAssistantTimeSaved | null>(null);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(false);
/** Guards against a poll tick overlapping an in-flight request. */
const refreshing = ref(false);

let pollTimer: ReturnType<typeof setInterval> | undefined;

const isEmpty = computed(() => entries.value.length === 0);
const hasMore = computed(() => entries.value.length < count.value);
// Show the panel once insights is reachable (the week figure resolved). A null
// week means insights is off / not permitted, so we hide it entirely.
const showTimeSaved = computed(
	() => timeSaved.value !== null && timeSaved.value.weekMinutes !== null,
);

/** Initial load + poll refresh: re-fetch the newest page that covers what's shown. */
async function load() {
	if (refreshing.value) return;
	refreshing.value = true;
	error.value = false;
	try {
		const limit = Math.min(MAX_PAGE_SIZE, Math.max(PAGE_SIZE, entries.value.length));
		const response = await window.electronAPI.getHistory({ limit });
		entries.value = response.results;
		count.value = response.count;
		now.value = Date.now();
	} catch (e) {
		// Surface the cause in devtools — the inline state only shows a generic message.
		console.error('Failed to load desktop-assistant history', e);
		error.value = true;
	} finally {
		loading.value = false;
		refreshing.value = false;
	}
}

/** Append older executions via the `lastId` cursor (range query: id < lastId). */
async function loadMore() {
	const oldest = entries.value.at(-1);
	if (!oldest || loadingMore.value) return;
	loadingMore.value = true;
	try {
		const response = await window.electronAPI.getHistory({ lastId: oldest.id, limit: PAGE_SIZE });
		entries.value = entries.value.concat(response.results);
		count.value = response.count;
		now.value = Date.now();
	} catch (e) {
		console.error('Failed to load more desktop-assistant history', e);
	} finally {
		loadingMore.value = false;
	}
}

/** Time saved moves slowly, so it's fetched on mount/refocus — not on every poll tick. */
async function loadTimeSaved() {
	try {
		timeSaved.value = await window.electronAPI.getTimeSaved();
	} catch (e) {
		console.error('Failed to load desktop-assistant time saved', e);
	}
}

function openExecution(workflowId: string, executionId: string) {
	void window.electronAPI.openExecution(workflowId, executionId);
}

/**
 * The tray window hides on blur but stays mounted, so the poll must pause while
 * the window isn't on screen — otherwise we keep hitting the instance the user
 * can't see. The main process tells us when the window is shown/focused vs
 * hidden/blurred (the renderer's own visibility events are unreliable here).
 */
const windowActive = ref(true);
let unsubscribeActive: (() => void) | undefined;

function refreshIfActive() {
	if (windowActive.value) void load();
}

onMounted(() => {
	void load();
	void loadTimeSaved();
	pollTimer = setInterval(refreshIfActive, POLL_INTERVAL_MS);
	unsubscribeActive = window.electronAPI.onWindowActiveChanged((active) => {
		windowActive.value = active;
		// Refresh immediately on return rather than waiting for the next tick.
		if (active) {
			void load();
			void loadTimeSaved();
		}
	});
});

onUnmounted(() => {
	if (pollTimer) clearInterval(pollTimer);
	unsubscribeActive?.();
});
</script>

<template>
	<div :class="$style.view">
		<TimeSavedPanel
			v-if="showTimeSaved && timeSaved"
			:week-minutes="timeSaved.weekMinutes"
			:month-minutes="timeSaved.monthMinutes"
		/>

		<div v-if="loading" :class="$style.state">
			<N8nSpinner />
			<N8nText color="text-light" size="small">{{
				i18n.baseText('desktopAssistant.history.loading')
			}}</N8nText>
		</div>

		<div v-else-if="error" :class="$style.state">
			<N8nText color="text-light" size="small">{{
				i18n.baseText('desktopAssistant.history.error')
			}}</N8nText>
			<N8nButton variant="outline" size="small" @click="load">{{
				i18n.baseText('desktopAssistant.history.retry')
			}}</N8nButton>
		</div>

		<div v-else-if="isEmpty" :class="$style.state">
			<N8nText color="text-light" size="small">{{
				i18n.baseText('desktopAssistant.history.empty')
			}}</N8nText>
		</div>

		<template v-else>
			<HistoryRow
				v-for="entry in entries"
				:key="entry.id"
				:entry="entry"
				:now="now"
				@open="openExecution"
			/>

			<div v-if="hasMore" :class="$style.loadMore">
				<N8nButton variant="outline" size="small" :loading="loadingMore" @click="loadMore">
					{{ i18n.baseText('desktopAssistant.history.loadMore') }}
				</N8nButton>
			</div>
		</template>
	</div>
</template>

<style module>
.view {
	display: flex;
	flex-direction: column;
	padding: 4px 8px 8px;
}

.state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--md);
}

.loadMore {
	display: flex;
	justify-content: center;
	padding: var(--spacing--sm) 0 var(--spacing--2xs);
}
</style>
