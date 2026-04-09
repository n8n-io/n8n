<script lang="ts" setup>
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiDebugStore } from '../instanceAiDebug.store';

const emit = defineEmits<{ close: [] }>();
const i18n = useI18n();
const store = useInstanceAiStore();
const debugStore = useInstanceAiDebugStore();

// --- Tab state ---
type Tab = 'events' | 'threads';
const activeTab = ref<Tab>('events');

// --- Events tab state ---
const expandedIndex = ref<number | null>(null);
const eventListRef = useTemplateRef<HTMLElement>('eventList');
const events = computed(() => store.debugEvents);

// --- Threads tab state ---
const expandedMessageIndex = ref<number | null>(null);

function toggleEvent(index: number) {
	expandedIndex.value = expandedIndex.value === index ? null : index;
}

function toggleMessage(index: number) {
	expandedMessageIndex.value = expandedMessageIndex.value === index ? null : index;
}

function formatJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function getTypeBadgeClass(type: string): string {
	if (type.includes('error')) return 'error';
	if (type.includes('finish')) return 'finish';
	if (type.includes('start') || type.includes('spawn')) return 'start';
	if (type.includes('tool')) return 'tool';
	if (type.includes('text') || type.includes('reasoning')) return 'text';
	if (type.includes('confirmation')) return 'confirm';
	return 'default';
}

function getRoleBadgeClass(role: string): string {
	if (role === 'user') return 'start';
	if (role === 'assistant') return 'tool';
	if (role === 'system') return 'confirm';
	return 'default';
}

function formatTime(iso: string): string {
	try {
		return new Date(iso).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
	} catch {
		return iso;
	}
}

function formatDateTime(iso: string): string {
	try {
		const d = new Date(iso);
		return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}`;
	} catch {
		return iso;
	}
}

function contentPreview(content: unknown): string {
	if (typeof content === 'string') {
		return content.length > 100 ? content.slice(0, 100) + '...' : content;
	}
	const str = JSON.stringify(content);
	return str.length > 100 ? str.slice(0, 100) + '...' : str;
}

async function handleCopyTrace() {
	const trace = store.copyFullTrace();
	await navigator.clipboard.writeText(trace);
}

// Auto-scroll to bottom when new events arrive
watch(
	() => events.value.length,
	() => {
		void nextTick(() => {
			if (eventListRef.value) {
				eventListRef.value.scrollTop = eventListRef.value.scrollHeight;
			}
		});
	},
);

// Load threads when switching to threads tab
watch(activeTab, (tab) => {
	if (tab === 'threads' && debugStore.threads.length === 0) {
		void debugStore.loadThreads();
	}
});

function handleSelectThread(threadId: string) {
	expandedMessageIndex.value = null;
	void debugStore.selectThread(threadId);
}

function handleRefreshThreads() {
	void debugStore.loadThreads();
}

// Tool call timing summary
const toolCallTimings = computed(() => {
	const timings: Array<{ name: string; duration: string; toolCallId: string }> = [];
	for (const msg of store.messages) {
		if (!msg.agentTree) continue;
		const nodes = [msg.agentTree, ...msg.agentTree.children];
		for (const node of nodes) {
			for (const tc of node.toolCalls) {
				if (tc.startedAt && tc.completedAt) {
					const ms = new Date(tc.completedAt).getTime() - new Date(tc.startedAt).getTime();
					timings.push({
						name: tc.toolName,
						duration: ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`,
						toolCallId: tc.toolCallId,
					});
				}
			}
		}
	}
	return timings;
});

onMounted(() => {
	if (activeTab.value === 'threads') {
		void debugStore.loadThreads();
	}
});
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<div :class="$style.headerTitle">
				<N8nIcon icon="bug" size="small" />
				<span>{{ i18n.baseText('instanceAi.debug.title') }}</span>
			</div>
			<div :class="$style.headerActions">
				<button v-if="activeTab === 'events'" :class="$style.copyButton" @click="handleCopyTrace">
					{{ i18n.baseText('instanceAi.debug.copyTrace') }}
				</button>
				<N8nIconButton icon="x" variant="ghost" size="small" @click="emit('close')" />
			</div>
		</div>

		<!-- Tab bar -->
		<div :class="$style.tabBar">
			<button
				:class="[$style.tab, activeTab === 'events' && $style.tabActive]"
				@click="activeTab = 'events'"
			>
				{{ i18n.baseText('instanceAi.debug.tab.events') }}
			</button>
			<button
				:class="[$style.tab, activeTab === 'threads' && $style.tabActive]"
				@click="activeTab = 'threads'"
			>
				{{ i18n.baseText('instanceAi.debug.tab.threads') }}
			</button>
		</div>

		<!-- Events tab -->
		<template v-if="activeTab === 'events'">
			<!-- Connection status -->
			<div :class="$style.statusBar">
				<span :class="$style.statusDot" :data-state="store.sseState" />
				<span>SSE: {{ store.sseState }}</span>
				<span :class="$style.eventCount">{{ events.length }} events</span>
			</div>

			<!-- Timing summary -->
			<div v-if="toolCallTimings.length > 0" :class="$style.timingSection">
				<div :class="$style.timingTitle">{{ i18n.baseText('instanceAi.debug.timing') }}</div>
				<div v-for="timing in toolCallTimings" :key="timing.toolCallId" :class="$style.timingRow">
					<span :class="$style.timingName">{{ timing.name }}</span>
					<span :class="$style.timingDuration">{{ timing.duration }}</span>
				</div>
			</div>

			<!-- Event log -->
			<div ref="eventList" :class="$style.eventList">
				<div
					v-for="(entry, index) in events"
					:key="index"
					:class="$style.eventRow"
					@click="toggleEvent(index)"
				>
					<div :class="$style.eventHeader">
						<span :class="$style.eventTime">{{ formatTime(entry.timestamp) }}</span>
						<span :class="[$style.eventType, $style[getTypeBadgeClass(entry.event.type)]]">
							{{ entry.event.type }}
						</span>
					</div>
					<pre v-if="expandedIndex === index" :class="$style.eventPayload">{{
						formatJson(entry.event)
					}}</pre>
				</div>
			</div>
		</template>

		<!-- Threads tab -->
		<template v-if="activeTab === 'threads'">
			<!-- Thread list -->
			<div :class="$style.threadListHeader">
				<span :class="$style.sectionLabel">{{
					i18n.baseText('instanceAi.debug.threads.title')
				}}</span>
				<button :class="$style.copyButton" @click="handleRefreshThreads">
					{{ i18n.baseText('instanceAi.debug.threads.refresh') }}
				</button>
			</div>

			<div v-if="debugStore.isLoadingThreads" :class="$style.loadingState">
				<N8nIcon icon="spinner" color="primary" spin size="small" />
			</div>

			<div v-else-if="debugStore.threads.length === 0" :class="$style.emptyState">
				{{ i18n.baseText('instanceAi.debug.threads.noThreads') }}
			</div>

			<div v-else :class="$style.threadList">
				<div
					v-for="thread in debugStore.threads"
					:key="thread.id"
					:class="[
						$style.threadRow,
						debugStore.selectedThreadId === thread.id && $style.threadRowSelected,
					]"
					@click="handleSelectThread(thread.id)"
				>
					<div :class="$style.threadRowMain">
						<span :class="$style.threadTitle">{{ thread.title || thread.id.slice(0, 8) }}</span>
						<span v-if="thread.id === store.currentThreadId" :class="$style.currentBadge">
							{{ i18n.baseText('instanceAi.debug.threads.current') }}
						</span>
					</div>
					<span :class="$style.threadTime">{{ formatDateTime(thread.updatedAt) }}</span>
				</div>
			</div>

			<!-- Thread detail -->
			<template v-if="debugStore.selectedThreadId">
				<div :class="$style.threadDetailHeader">
					<span :class="$style.sectionLabel">{{
						i18n.baseText('instanceAi.debug.threads.messages')
					}}</span>
				</div>

				<div :class="$style.threadDetailContent">
					<div v-if="debugStore.isLoadingMessages" :class="$style.loadingState">
						<N8nIcon icon="spinner" color="primary" spin size="small" />
					</div>
					<div v-else-if="debugStore.threadMessages.length === 0" :class="$style.emptyState">
						{{ i18n.baseText('instanceAi.debug.threads.noMessages') }}
					</div>
					<template v-else>
						<div
							v-for="(msg, mIdx) in debugStore.threadMessages"
							:key="msg.id"
							:class="$style.messageRow"
							@click="toggleMessage(mIdx)"
						>
							<div :class="$style.messageHeader">
								<span :class="[$style.eventType, $style[getRoleBadgeClass(msg.role)]]">
									{{ msg.role }}
								</span>
								<span :class="$style.eventTime">{{ formatTime(msg.createdAt) }}</span>
							</div>
							<div :class="$style.messagePreview">{{ contentPreview(msg.content) }}</div>
							<pre v-if="expandedMessageIndex === mIdx" :class="$style.eventPayload">{{
								formatJson(msg.content)
							}}</pre>
						</div>
					</template>
				</div>
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: 420px;
	background: var(--color--background);
	border-left: var(--border);
	display: flex;
	flex-direction: column;
	z-index: 10;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.copyButton {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--3xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: var(--border);
	background: var(--color--background);
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.tabBar {
	display: flex;
	border-bottom: var(--border);
}

.tab {
	flex: 1;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	font-weight: var(--font-weight--regular);
	cursor: pointer;
	border: none;
	background: none;
	color: var(--color--text--tint-1);
	border-bottom: 2px solid transparent;
	transition:
		color 0.15s,
		border-color 0.15s;

	&:hover {
		color: var(--color--text);
	}
}

.tabActive {
	color: var(--color--primary);
	font-weight: var(--font-weight--bold);
	border-bottom-color: var(--color--primary);
}

.statusBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--sm);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	border-bottom: var(--border);
}

.statusDot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--color--text--tint-1);

	&[data-state='connected'] {
		background: var(--color--success);
	}

	&[data-state='connecting'],
	&[data-state='reconnecting'] {
		background: var(--color--warning);
	}
}

.eventCount {
	margin-left: auto;
}

.timingSection {
	padding: var(--spacing--4xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.timingTitle {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin-bottom: var(--spacing--4xs);
}

.timingRow {
	display: flex;
	justify-content: space-between;
	font-size: var(--font-size--3xs);
	padding: 1px 0;
}

.timingName {
	font-family: monospace;
	color: var(--color--text--tint-1);
}

.timingDuration {
	font-family: monospace;
	color: var(--color--text--tint-1);
}

.eventList {
	flex: 1;
	overflow-y: auto;
	font-size: var(--font-size--3xs);
}

.eventRow {
	padding: var(--spacing--4xs) var(--spacing--sm);
	cursor: pointer;
	border-bottom: 1px solid var(--color--foreground--tint-2);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.eventHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.eventTime {
	font-family: monospace;
	color: var(--color--text--tint-1);
}

.eventType {
	padding: 1px var(--spacing--4xs);
	border-radius: var(--radius--sm);
	font-family: monospace;
	font-size: var(--font-size--3xs);
}

.error {
	background: color-mix(in srgb, var(--color--danger) 15%, transparent);
	color: var(--color--danger);
}

.finish {
	background: var(--color--foreground);
	color: var(--color--text);
}

.start {
	background: color-mix(in srgb, var(--color--success) 15%, transparent);
	color: var(--color--success);
}

.tool {
	background: color-mix(in srgb, var(--color--primary) 15%, transparent);
	color: var(--color--primary);
}

.text {
	background: var(--color--foreground);
	color: var(--color--text);
}

.confirm {
	background: color-mix(in srgb, var(--color--warning) 15%, transparent);
	color: var(--color--warning);
}

.default {
	background: var(--color--foreground);
	color: var(--color--text);
}

.eventPayload {
	margin: var(--spacing--4xs) 0 0;
	padding: var(--spacing--4xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 200px;
	overflow-y: auto;
	color: var(--color--text--tint-1);
}

/* Thread Inspector styles */
.threadListHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.sectionLabel {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.loadingState {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg);
	color: var(--color--text--tint-1);
}

.emptyState {
	padding: var(--spacing--lg) var(--spacing--sm);
	text-align: center;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.threadList {
	max-height: 200px;
	overflow-y: auto;
	border-bottom: var(--border);
}

.threadRow {
	padding: var(--spacing--4xs) var(--spacing--sm);
	cursor: pointer;
	border-bottom: 1px solid var(--color--foreground--tint-2);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.threadRowSelected {
	background: color-mix(in srgb, var(--color--primary) 12%, var(--color--background));

	&:hover {
		background: color-mix(in srgb, var(--color--primary) 12%, var(--color--background));
	}
}

.threadRowMain {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.threadTitle {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex: 1;
}

.currentBadge {
	padding: 0 var(--spacing--4xs);
	border-radius: var(--radius--sm);
	font-size: var(--font-size--3xs);
	background: color-mix(in srgb, var(--color--success) 15%, transparent);
	color: var(--color--success);
}

.threadTime {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.threadDetailHeader {
	display: flex;
	border-bottom: var(--border);
}

.threadDetailContent {
	flex: 1;
	overflow-y: auto;
	font-size: var(--font-size--3xs);
}

.messageRow {
	padding: var(--spacing--4xs) var(--spacing--sm);
	cursor: pointer;
	border-bottom: 1px solid var(--color--foreground--tint-2);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.messageHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-bottom: 2px;
}

.messagePreview {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
