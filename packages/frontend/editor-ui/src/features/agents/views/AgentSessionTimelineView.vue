<script lang="ts" setup>
import { useToast } from '@/app/composables/useToast';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import { AGENT_SESSIONS_LIST_VIEW } from '@/features/agents/constants';
import type {
	ExecutionThread,
	ThreadExecution,
} from '@/features/agents/composables/useAgentThreadsApi';
import RichInteractionCard from '@/features/agents/components/RichInteractionCard.vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface TimelineEvent {
	type: 'text' | 'tool-call' | 'working-memory' | 'suspension';
	[key: string]: unknown;
}

interface ToolCallEvent {
	type: 'tool-call';
	name: string;
	toolCallId: string;
	input: unknown;
	output: unknown;
	startTime: number;
	endTime: number;
	success: boolean;
}

/** A unified item rendered on the timeline — either a user message or a timeline event. */
interface TimelineItem {
	kind: 'user' | 'text' | 'tool-call' | 'working-memory' | 'suspension';
	executionId: string;
	content?: string;
	toolCall?: ToolCallEvent;
	toolName?: string;
	toolCallId?: string;
	timestamp: number;
}

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const sessionsStore = useAgentSessionsStore();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);
const threadId = computed(() => route.params.threadId as string);

const thread = ref<ExecutionThread | null>(null);
const executions = ref<ThreadExecution[]>([]);
const loading = ref(true);
const selectedItem = ref<TimelineItem | null>(null);

onMounted(async () => {
	try {
		const result = await sessionsStore.getThreadDetail(
			projectId.value,
			threadId.value,
			agentId.value,
		);
		thread.value = result.thread;
		executions.value = result.executions;
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	} finally {
		loading.value = false;
	}
});

function getMetadata(execution: ThreadExecution, key: string): string | undefined {
	return execution.metadata.find((m) => m.key === key)?.value;
}

function parseTimeline(execution: ThreadExecution): TimelineEvent[] {
	const raw = getMetadata(execution, 'timeline');
	if (!raw) return [];
	try {
		return JSON.parse(raw) as TimelineEvent[];
	} catch {
		return [];
	}
}

/** Build a flat, ordered list of timeline items across all executions. */
const timelineItems = computed<TimelineItem[]>(() => {
	const items: TimelineItem[] = [];
	for (const exec of executions.value) {
		const userMsg = getMetadata(exec, 'userMessage');
		if (userMsg) {
			items.push({
				kind: 'user',
				executionId: exec.id,
				content: userMsg,
				timestamp: exec.startedAt ? new Date(exec.startedAt).getTime() : 0,
			});
		}

		const events = parseTimeline(exec);
		if (events.length > 0) {
			for (const event of events) {
				if (event.type === 'text') {
					items.push({
						kind: 'text',
						executionId: exec.id,
						content: event.content as string,
						timestamp: (event.timestamp as number) ?? 0,
					});
				} else if (event.type === 'tool-call') {
					const tc = event as unknown as ToolCallEvent;
					items.push({
						kind: 'tool-call',
						executionId: exec.id,
						toolCall: tc,
						toolName: tc.name,
						toolCallId: tc.toolCallId,
						timestamp: tc.startTime,
					});
				} else if (event.type === 'working-memory') {
					items.push({
						kind: 'working-memory',
						executionId: exec.id,
						content: event.content as string,
						timestamp: (event.timestamp as number) ?? 0,
					});
				} else if (event.type === 'suspension') {
					items.push({
						kind: 'suspension',
						executionId: exec.id,
						toolName: event.toolName as string,
						toolCallId: event.toolCallId as string,
						timestamp: (event.timestamp as number) ?? 0,
					});
				}
			}
		} else {
			// Fallback for executions without timeline data (old format)
			const response = getMetadata(exec, 'assistantResponse');
			if (response) {
				items.push({
					kind: 'text',
					executionId: exec.id,
					content: response,
					timestamp: exec.stoppedAt ? new Date(exec.stoppedAt).getTime() : 0,
				});
			}
			// Also pull in tool calls from the old format
			const rawToolCalls = getMetadata(exec, 'toolCalls');
			if (rawToolCalls) {
				try {
					const tcs = JSON.parse(rawToolCalls) as Array<{
						name: string;
						input: unknown;
						output: unknown;
					}>;
					for (const tc of tcs) {
						items.push({
							kind: 'tool-call',
							executionId: exec.id,
							toolCall: {
								type: 'tool-call',
								name: tc.name,
								toolCallId: '',
								input: tc.input,
								output: tc.output,
								startTime: exec.startedAt ? new Date(exec.startedAt).getTime() : 0,
								endTime: exec.stoppedAt ? new Date(exec.stoppedAt).getTime() : 0,
								success: true,
							},
							toolName: tc.name,
							toolCallId: '',
							timestamp: exec.startedAt ? new Date(exec.startedAt).getTime() : 0,
						});
					}
				} catch {
					// ignore parse errors
				}
			}
		}
	}
	return items;
});

function formatTimestamp(ts: number): string {
	if (!ts) return '';
	const { date, time } = convertToDisplayDate(new Date(ts).toISOString());
	return `${date} ${time}`;
}

function formatDuration(ms: number): string {
	if (!ms || ms <= 0) return '0ms';
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function toolDuration(tc: ToolCallEvent): string {
	if (!tc.endTime || !tc.startTime) return '';
	return formatDuration(tc.endTime - tc.startTime);
}

const sessionTitle = computed(() => {
	if (!thread.value) return '';
	return thread.value.title ?? `Session ${thread.value.sessionNumber}`;
});

const triggerSource = computed(() => {
	if (executions.value.length === 0) return null;
	const first = executions.value[0];
	const source = getMetadata(first, 'source');
	return source ?? 'chat';
});

const triggerLabel = computed(() => {
	const source = triggerSource.value;
	if (!source) return '';
	const name = source.charAt(0).toUpperCase() + source.slice(1);
	return `Trigger \u2192 ${name}`;
});

function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightAgentName(text: string): string {
	if (!thread.value?.agentName) return escapeHtml(text);
	const escaped = escapeHtml(text);
	const name = escapeHtml(thread.value.agentName);
	return escaped.replace(new RegExp(`@${name}`, 'gi'), `<strong>@${name}</strong>`);
}

function goBack() {
	void router.push({
		name: AGENT_SESSIONS_LIST_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
	});
}

function selectItem(item: TimelineItem) {
	selectedItem.value = selectedItem.value === item ? null : item;
}
</script>

<template>
	<div :class="$style.view">
		<!-- Top bar -->
		<div :class="$style.topBar">
			<div :class="$style.topBarLeft">
				<button :class="$style.backButton" @click="goBack">
					<N8nIcon icon="arrow-left" />
				</button>
				<span v-if="thread" :class="$style.agentName">{{ thread.agentName }}</span>
				<span :class="$style.sessionTitle">{{ sessionTitle }}</span>
			</div>
			<div v-if="thread" :class="$style.topBarRight">
				<span :class="$style.stat">
					{{ (thread.totalPromptTokens + thread.totalCompletionTokens).toLocaleString() }}
					{{ i18n.baseText('agentSessions.drawer.tokens').toLowerCase() }}
				</span>
				<span :class="$style.statSep">·</span>
				<span :class="$style.stat">${{ thread.totalCost.toFixed(4) }}</span>
				<span :class="$style.statSep">·</span>
				<span :class="$style.stat">{{ formatDuration(thread.totalDuration) }}</span>
			</div>
		</div>

		<!-- Panels -->
		<div :class="$style.panels">
			<!-- Timeline -->
			<div :class="$style.timelinePanel">
				<div v-if="loading" :class="$style.loadingState">Loading...</div>
				<template v-else>
					<!-- Trigger header -->
					<div v-if="triggerSource" :class="$style.triggerRow">
						<div :class="$style.triggerCorner" />
						<div :class="$style.triggerLabel">
							<N8nIcon icon="bolt-filled" :class="$style.triggerIcon" />
							{{ triggerLabel }}
						</div>
						<span :class="$style.triggerTimestamp">
							{{ thread ? formatTimestamp(new Date(thread.createdAt).getTime()) : '' }}
						</span>
					</div>
					<div :class="$style.timeline">
					<div
						v-for="(item, idx) in timelineItems"
						:key="idx"
						:class="[$style.card, selectedItem === item && $style.cardSelected]"
						@click="selectItem(item)"
					>
						<!-- User message -->
						<template v-if="item.kind === 'user'">
							<div :class="$style.cardHeader">
								<span :class="$style.cardLabel">
									{{ i18n.baseText('agentSessions.timeline.user') }}
								</span>
							</div>
							<!-- eslint-disable vue/no-v-html -->
							<div :class="$style.cardBody" v-html="highlightAgentName(item.content!)" />
							<!-- eslint-enable vue/no-v-html -->
						</template>

						<!-- Assistant text -->
						<template v-else-if="item.kind === 'text'">
							<div :class="$style.cardHeader">
								<span :class="$style.cardLabel">
									{{ thread?.agentName ?? i18n.baseText('agentSessions.timeline.assistant') }}
								</span>
							</div>
							<div :class="$style.cardBody">{{ item.content }}</div>
						</template>

						<!-- Tool call -->
						<template v-else-if="item.kind === 'tool-call' && item.toolCall">
							<div :class="$style.cardHeader">
								<span :class="$style.cardLabel">
									<N8nIcon icon="wrench" :class="$style.cardIcon" />
									{{ i18n.baseText('agentSessions.timeline.tool') }} &rarr; {{ item.toolCall.name }}
								</span>
								<span
									:class="[
										$style.badge,
										item.toolCall.success ? $style.badgeSuccess : $style.badgeError,
									]"
								>
									{{
										item.toolCall.success
											? i18n.baseText('agentSessions.timeline.success')
											: i18n.baseText('agentSessions.timeline.error')
									}}
								</span>
							</div>
							<div v-if="toolDuration(item.toolCall)" :class="$style.cardMeta">
								{{ toolDuration(item.toolCall) }}
							</div>
						</template>

						<!-- Working memory -->
						<template v-else-if="item.kind === 'working-memory'">
							<div :class="$style.cardHeader">
								<span :class="$style.cardLabel">
									<N8nIcon icon="brain" :class="$style.cardIcon" />
									{{ i18n.baseText('agentSessions.timeline.memory') }}
								</span>
							</div>
							<div :class="$style.cardBody">
								{{ (item.content ?? '').slice(0, 100)
								}}{{ (item.content ?? '').length > 100 ? '...' : '' }}
							</div>
						</template>

						<!-- Suspension -->
						<template v-else-if="item.kind === 'suspension'">
							<div :class="$style.cardHeader">
								<span :class="$style.cardLabel">
									{{ i18n.baseText('agentSessions.timeline.suspension') }}
								</span>
							</div>
						</template>

						<div v-if="item.timestamp" :class="$style.cardTimestamp">
							{{ formatTimestamp(item.timestamp) }}
						</div>
					</div>
				</div>
				</template>
			</div>

			<!-- Detail panel -->
			<div :class="$style.detailPanel">
				<template v-if="selectedItem?.kind === 'tool-call' && selectedItem.toolCall">
					<div :class="$style.detailHeader">
						<span>
							{{ i18n.baseText('agentSessions.timeline.tool') }} &rarr;
							{{ selectedItem.toolCall.name }}
						</span>
						<button :class="$style.closeButton" @click="selectedItem = null">
							<N8nIcon icon="x" />
						</button>
					</div>
					<div :class="$style.detailInfo">
						<div :class="$style.detailRow">
							<span :class="$style.detailLabel">{{
								i18n.baseText('agentSessions.timeline.id')
							}}</span>
							<span :class="$style.detailValue">{{ selectedItem.toolCall.toolCallId }}</span>
						</div>
						<div :class="$style.detailRow">
							<span :class="$style.detailLabel">{{
								i18n.baseText('agentSessions.timeline.created')
							}}</span>
							<span :class="$style.detailValue">{{
								formatTimestamp(selectedItem.toolCall.startTime)
							}}</span>
						</div>
						<div :class="$style.detailRow">
							<span :class="$style.detailLabel">{{
								i18n.baseText('agentSessions.timeline.duration')
							}}</span>
							<span :class="$style.detailValue">{{ toolDuration(selectedItem.toolCall) }}</span>
						</div>
						<div :class="$style.detailRow">
							<span :class="$style.detailLabel">{{
								i18n.baseText('agentSessions.timeline.status')
							}}</span>
							<span
								:class="[
									$style.badge,
									selectedItem.toolCall.success ? $style.badgeSuccess : $style.badgeError,
								]"
							>
								{{
									selectedItem.toolCall.success
										? i18n.baseText('agentSessions.timeline.success')
										: i18n.baseText('agentSessions.timeline.error')
								}}
							</span>
						</div>
					</div>

					<!-- Rich interaction visual or raw JSON -->
					<template v-if="selectedItem.toolCall.name === 'rich_interaction'">
						<div :class="$style.detailSection">
							<RichInteractionCard
								:input="selectedItem.toolCall.input"
								:output="selectedItem.toolCall.output"
							/>
						</div>
					</template>
					<template v-else>
						<div :class="$style.detailSection">
							<div :class="$style.detailSectionLabel">
								{{ i18n.baseText('agentSessions.timeline.input') }}
							</div>
							<pre :class="$style.json">{{
								JSON.stringify(selectedItem.toolCall.input, null, 2)
							}}</pre>
						</div>
						<div :class="$style.detailSection">
							<div :class="$style.detailSectionLabel">
								{{ i18n.baseText('agentSessions.timeline.output') }}
							</div>
							<pre :class="$style.json">{{
								JSON.stringify(selectedItem.toolCall.output, null, 2)
							}}</pre>
						</div>
					</template>
				</template>

				<template v-else-if="selectedItem?.kind === 'working-memory'">
					<div :class="$style.detailHeader">
						<span>
							<N8nIcon icon="brain" :class="$style.cardIcon" />
							{{ i18n.baseText('agentSessions.timeline.memory') }}
						</span>
						<button :class="$style.closeButton" @click="selectedItem = null">
							<N8nIcon icon="x" />
						</button>
					</div>
					<div :class="$style.detailSection">
						<pre :class="$style.json">{{ selectedItem.content }}</pre>
					</div>
				</template>

				<template v-else-if="selectedItem?.kind === 'user' || selectedItem?.kind === 'text'">
					<div :class="$style.detailHeader">
						<span>
							{{
								selectedItem.kind === 'user'
									? i18n.baseText('agentSessions.timeline.user')
									: (thread?.agentName ?? i18n.baseText('agentSessions.timeline.assistant'))
							}}
						</span>
						<button :class="$style.closeButton" @click="selectedItem = null">
							<N8nIcon icon="x" />
						</button>
					</div>
					<div :class="$style.detailSection">
						<div :class="$style.messageContent">{{ selectedItem.content }}</div>
					</div>
				</template>

				<div v-else :class="$style.emptyDetail">
					{{ i18n.baseText('agentSessions.timeline.selectItem') }}
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.view {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.topBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--foreground--tint-2);
	flex-shrink: 0;
}

.topBarLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.topBarRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.backButton {
	background: none;
	border: none;
	color: var(--color--primary);
	cursor: pointer;
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	display: flex;
	align-items: center;

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}

.agentName {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.sessionTitle {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
}

.stat {
	white-space: nowrap;
}

.statSep {
	color: var(--color--text--tint-2);
}

.panels {
	display: flex;
	flex: 1;
	min-height: 0;
}

.timelinePanel {
	flex: 6;
	overflow-y: auto;
	padding: var(--spacing--sm) var(--spacing--lg);
	border-right: var(--border-width) var(--border-style) var(--color--foreground);
}

.triggerRow {
	display: flex;
	align-items: flex-start;
	// Left border of corner must align with the timeline ::after line (left: 33px on .timeline).
	// padding-left positions the content start; the corner border-left draws at this edge.
	padding-left: 33px;
	position: relative;
	margin-bottom: 0;
}

.triggerCorner {
	width: var(--spacing--sm);
	min-height: var(--spacing--lg);
	border-left: 2px solid var(--color--foreground--shade-1);
	border-top: 2px solid var(--color--foreground--shade-1);
	border-radius: var(--radius--lg) 0 0 0;
	flex-shrink: 0;
	margin-top: 8px;
}

.triggerLabel {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	white-space: nowrap;
	margin-left: var(--spacing--2xs);
}

.triggerIcon {
	color: var(--color--primary);
}

.triggerTimestamp {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
	margin-left: auto;
}

.timeline {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);

	// Vertical line — aligned with the trigger corner's left border
	&::after {
		content: '';
		position: absolute;
		left: 33px;
		top: 0;
		bottom: 0;
		width: 2px;
		background-color: var(--color--foreground--shade-1);
	}
}

.card {
	position: relative;
	z-index: 1;
	padding: var(--spacing--xs) var(--spacing--sm);
	background-color: var(--color--background);
	border: 2px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	font-size: var(--font-size--sm);
	cursor: pointer;
	transition:
		border-color 0.15s,
		background-color 0.15s;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}
}

.cardSelected {
	border-color: var(--color--primary);
	background-color: var(--color--foreground--tint-2);
}

.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.cardLabel {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.cardIcon {
	font-size: var(--font-size--2xs);
}

.cardBody {
	margin-top: var(--spacing--4xs);
	font-size: var(--font-size--sm);
	color: var(--color--text);
	white-space: pre-wrap;
}

.cardMeta {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	margin-top: var(--spacing--4xs);
}

.cardTimestamp {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	margin-top: var(--spacing--4xs);
}

.badge {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	padding: 1px var(--spacing--3xs);
	border-radius: var(--radius--lg);
	white-space: nowrap;
}

.badgeSuccess {
	background-color: var(--color--success--tint-3);
	color: var(--color--success--shade-1);
}

.badgeError {
	background-color: var(--color--danger--tint-4);
	color: var(--color--danger);
}

.detailPanel {
	flex: 4;
	overflow-y: auto;
	padding: var(--spacing--sm);
}

.detailHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	margin-bottom: var(--spacing--sm);
}

.closeButton {
	background: none;
	border: none;
	color: var(--color--text--tint-1);
	cursor: pointer;
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	display: flex;
	align-items: center;

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}

.detailInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--sm);
	padding-bottom: var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.detailRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.detailLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
}

.detailValue {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	text-align: right;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 60%;
}

.detailSection {
	margin-bottom: var(--spacing--sm);
}

.detailSectionLabel {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	margin-bottom: var(--spacing--3xs);
}

.json {
	background-color: var(--color--foreground--tint-1);
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	white-space: pre-wrap;
	overflow-x: auto;
}

.messageContent {
	font-size: var(--font-size--sm);
	color: var(--color--text);
	white-space: pre-wrap;
	line-height: var(--line-height--xl);
}

.emptyDetail {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-2);
	font-size: var(--font-size--sm);
}

.loadingState {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-2);
}
</style>
