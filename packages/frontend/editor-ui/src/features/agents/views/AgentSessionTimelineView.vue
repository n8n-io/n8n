<script lang="ts" setup>
import { truncate } from '@n8n/utils';
import { useToast } from '@/app/composables/useToast';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import { AGENT_BUILDER_VIEW, CONTINUE_SESSION_ID_PARAM } from '@/features/agents/constants';
import type {
	ExecutionThread,
	ThreadExecution,
} from '@/features/agents/composables/useAgentThreadsApi';
import RichInteractionCard from '@/features/agents/components/RichInteractionCard.vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import VueMarkdown from 'vue-markdown-render';
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
	resumed?: boolean;
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
const selectedIndex = ref<number | null>(null);

const selectedItem = computed<TimelineItem | null>(() =>
	selectedIndex.value !== null ? (timelineItems.value[selectedIndex.value] ?? null) : null,
);

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
		const isResumed = getMetadata(exec, 'hitlStatus') === 'resumed';
		let resumedTagUsed = false;
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
					const showResumed = isResumed && !resumedTagUsed;
					if (showResumed) resumedTagUsed = true;
					items.push({
						kind: 'text',
						executionId: exec.id,
						content: event.content as string,
						timestamp: (event.timestamp as number) ?? 0,
						resumed: showResumed,
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

function formatTime(ts: number): string {
	if (!ts) return '';
	const { time } = convertToDisplayDate(new Date(ts).toISOString());
	return time;
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
	const title = thread.value.title ?? i18n.baseText('agents.builder.chat.newChat.label');
	return truncate(title, 64);
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

const triggerIcon = computed(() => {
	return triggerSource.value === 'slack' ? 'slack' : 'bolt-filled';
});

const triggerTimestamp = computed(() => {
	const first = timelineItems.value[0];
	if (first?.timestamp) return formatTimestamp(first.timestamp);
	if (thread.value) return formatTimestamp(new Date(thread.value.createdAt).getTime());
	return '';
});

/** Parse a value that might be a JSON string into an object for display. */
function ensureParsed(value: unknown): unknown {
	if (typeof value === 'string') {
		try {
			return JSON.parse(value);
		} catch {
			return value;
		}
	}
	return value;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function highlightJson(value: unknown, indent = 0): string {
	const pad = '  '.repeat(indent);
	const padInner = '  '.repeat(indent + 1);
	if (value === null) return '<span class="json-bool">null</span>';
	if (typeof value === 'boolean') return `<span class="json-bool">${value}</span>`;
	if (typeof value === 'number') return `<span class="json-number">${value}</span>`;
	if (typeof value === 'string')
		return `<span class="json-string">&quot;${escapeHtml(value)}&quot;</span>`;
	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const items = value.map((v) => `${padInner}${highlightJson(v, indent + 1)}`);
		return `[\n${items.join(',\n')}\n${pad}]`;
	}
	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) return '{}';
		const lines = entries.map(
			([k, v]) =>
				`${padInner}<span class="json-key">&quot;${escapeHtml(k)}&quot;</span>: ${highlightJson(v, indent + 1)}`,
		);
		return `{\n${lines.join(',\n')}\n${pad}}`;
	}
	return escapeHtml(String(value));
}

function goBack() {
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
	});
}

function continueChat() {
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
		query: { [CONTINUE_SESSION_ID_PARAM]: threadId.value },
	});
}

function selectItem(idx: number) {
	selectedIndex.value = selectedIndex.value === idx ? null : idx;
}

function typeClass(kind: TimelineItem['kind']): 'cardUser' | 'cardAgent' | 'cardTool' | '' {
	if (kind === 'user') return 'cardUser';
	if (kind === 'text') return 'cardAgent';
	if (kind === 'tool-call') return 'cardTool';
	return '';
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
				<button
					v-if="triggerSource === 'chat'"
					:class="$style.continueButton"
					@click="continueChat"
				>
					<N8nIcon icon="message-square" :size="12" />
					{{ i18n.baseText('agentSessions.timeline.continueChat') }}
				</button>
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
							<N8nIcon :icon="triggerIcon" :class="$style.triggerIcon" />
							{{ triggerLabel }}
						</div>
						<span :class="$style.triggerTimestamp">
							{{ triggerTimestamp }}
						</span>
					</div>
					<div :class="$style.timeline">
						<div
							v-for="(item, idx) in timelineItems"
							:key="idx"
							:class="[
								$style.card,
								$style[typeClass(item.kind)],
								item.kind !== 'user' && $style.cardResponse,
								selectedIndex === idx && $style.cardSelected,
							]"
							@click="selectItem(idx)"
						>
							<!-- User message -->
							<template v-if="item.kind === 'user'">
								<div :class="$style.cardHeader">
									<div :class="$style.cardHeaderLeft">
										<span :class="$style.cardLabel">
											{{ i18n.baseText('agentSessions.timeline.user') }}
										</span>
									</div>
									<span :class="$style.cardTime">{{ formatTime(item.timestamp) }}</span>
								</div>
								<VueMarkdown
									:source="item.content ?? ''"
									class="agent-markdown"
									:class="$style.cardBody"
								/>
							</template>

							<!-- Assistant text -->
							<template v-else-if="item.kind === 'text'">
								<div :class="$style.cardHeader">
									<div :class="$style.cardHeaderLeft">
										<span :class="$style.cardLabel">
											{{ thread?.agentName ?? i18n.baseText('agentSessions.timeline.assistant') }}
										</span>
										<span v-if="item.resumed" :class="[$style.badge, $style.badgeResumed]">
											Resumed
										</span>
									</div>
									<span :class="$style.cardTime">{{ formatTime(item.timestamp) }}</span>
								</div>
								<VueMarkdown
									:source="item.content ?? ''"
									class="agent-markdown"
									:class="$style.cardBody"
								/>
							</template>

							<!-- Tool call -->
							<template v-else-if="item.kind === 'tool-call' && item.toolCall">
								<div :class="$style.cardHeader">
									<div :class="$style.cardHeaderLeft">
										<span :class="$style.cardLabel">
											<N8nIcon icon="wrench" :class="$style.cardIcon" />
											{{ i18n.baseText('agentSessions.timeline.tool') }} &rarr;
											{{ item.toolCall.name }}
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
									<span :class="$style.cardTime">{{ formatTime(item.timestamp) }}</span>
								</div>
							</template>

							<!-- Working memory -->
							<template v-else-if="item.kind === 'working-memory'">
								<div :class="$style.cardHeader">
									<div :class="$style.cardHeaderLeft">
										<span :class="$style.cardLabel">
											<N8nIcon icon="brain" :class="$style.cardIcon" />
											{{ i18n.baseText('agentSessions.timeline.memory') }}
										</span>
									</div>
									<span :class="$style.cardTime">{{ formatTime(item.timestamp) }}</span>
								</div>
							</template>

							<!-- Suspension -->
							<template v-else-if="item.kind === 'suspension'">
								<div :class="$style.cardHeader">
									<div :class="$style.cardHeaderLeft">
										<span :class="$style.cardLabel">
											{{ i18n.baseText('agentSessions.timeline.suspension') }}
										</span>
									</div>
									<span :class="$style.cardTime">{{ formatTime(item.timestamp) }}</span>
								</div>
							</template>
						</div>
					</div>
				</template>
			</div>

			<!-- Detail panel -->
			<div :class="$style.detailPanel">
				<template v-if="selectedItem">
					<!-- Header -->
					<div :class="$style.detailHeader">
						<span>
							<template v-if="selectedItem.kind === 'tool-call' && selectedItem.toolCall">
								<N8nIcon icon="wrench" :class="$style.cardIcon" />
								{{ i18n.baseText('agentSessions.timeline.tool') }} &rarr;
								{{ selectedItem.toolCall.name }}
							</template>
							<template v-else-if="selectedItem.kind === 'working-memory'">
								<N8nIcon icon="brain" :class="$style.cardIcon" />
								{{ i18n.baseText('agentSessions.timeline.memory') }}
							</template>
							<template v-else-if="selectedItem.kind === 'user'">
								{{ i18n.baseText('agentSessions.timeline.user') }}
							</template>
							<template v-else-if="selectedItem.kind === 'text'">
								{{ thread?.agentName ?? i18n.baseText('agentSessions.timeline.assistant') }}
							</template>
							<template v-else>
								{{ i18n.baseText('agentSessions.timeline.suspension') }}
							</template>
						</span>
						<button :class="$style.closeButton" @click="selectedIndex = null">
							<N8nIcon icon="x" />
						</button>
					</div>

					<!-- Info rows (timestamp, duration, status for tools) -->
					<div :class="$style.detailInfo">
						<div v-if="selectedItem.timestamp" :class="$style.detailRow">
							<span :class="$style.detailLabel">{{
								i18n.baseText('agentSessions.timeline.created')
							}}</span>
							<span :class="$style.detailValue">{{ formatTimestamp(selectedItem.timestamp) }}</span>
						</div>
						<div
							v-if="
								selectedItem.kind === 'tool-call' &&
								selectedItem.toolCall &&
								toolDuration(selectedItem.toolCall)
							"
							:class="$style.detailRow"
						>
							<span :class="$style.detailLabel">{{
								i18n.baseText('agentSessions.timeline.duration')
							}}</span>
							<span :class="$style.detailValue">{{ toolDuration(selectedItem.toolCall) }}</span>
						</div>
						<div
							v-if="selectedItem.kind === 'tool-call' && selectedItem.toolCall"
							:class="$style.detailRow"
						>
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
						<div v-if="selectedItem.resumed" :class="$style.detailRow">
							<span :class="$style.detailLabel">{{
								i18n.baseText('agentSessions.timeline.status')
							}}</span>
							<span :class="[$style.badge, $style.badgeResumed]"> Resumed </span>
						</div>
					</div>

					<!-- Content -->
					<template v-if="selectedItem.kind === 'tool-call' && selectedItem.toolCall">
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
								<!-- eslint-disable vue/no-v-html -->
								<pre
									:class="$style.json"
									v-html="highlightJson(ensureParsed(selectedItem.toolCall.input))"
								/>
								<!-- eslint-enable vue/no-v-html -->
							</div>
							<div :class="$style.detailSection">
								<div :class="$style.detailSectionLabel">
									{{ i18n.baseText('agentSessions.timeline.output') }}
								</div>
								<!-- eslint-disable vue/no-v-html -->
								<pre
									:class="$style.json"
									v-html="highlightJson(ensureParsed(selectedItem.toolCall.output))"
								/>
								<!-- eslint-enable vue/no-v-html -->
							</div>
						</template>
					</template>
					<template v-else-if="selectedItem.kind === 'working-memory'">
						<div :class="$style.detailSection">
							<pre :class="$style.json">{{ selectedItem.content }}</pre>
						</div>
					</template>
					<template v-else-if="selectedItem.kind === 'user' || selectedItem.kind === 'text'">
						<div :class="$style.detailSection">
							<VueMarkdown
								:source="selectedItem.content ?? ''"
								class="agent-markdown"
								:class="$style.messageContent"
							/>
						</div>
					</template>
				</template>

				<div v-else :class="$style.emptyDetail">
					{{ i18n.baseText('agentSessions.timeline.selectItem') }}
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
@mixin dark-mode {
	body[data-theme='dark'] & {
		@content;
	}

	@media (prefers-color-scheme: dark) {
		body:not([data-theme]) & {
			@content;
		}
	}
}

.view {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;

	@include dark-mode {
		background-color: var(--color--neutral-950);
	}
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
	color: var(--color--text);
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

.sessionTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.stat {
	white-space: nowrap;
}

.statSep {
	color: var(--color--text--tint-1);
}

.continueButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: none;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	color: var(--color--primary);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	cursor: pointer;

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
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
	padding-left: var(--spacing--md);
	position: relative;
}

.triggerCorner {
	width: var(--spacing--sm);
	min-height: var(--spacing--lg);
	border-left: 2px solid var(--color--foreground--shade-1);
	border-top: 2px solid var(--color--foreground--shade-1);
	border-radius: var(--radius--lg) 0 0 0;
	flex-shrink: 0;
	margin-top: 7px;
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
	color: var(--color--text--tint-1);
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
		left: var(--spacing--md);
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
	border-left: none;
	border-radius: var(--radius--lg);
	font-size: var(--font-size--sm);
	cursor: pointer;
	transition:
		border-color 0.15s,
		background-color 0.15s;

	// Type-indicator strip on the left edge
	&::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 3px;
		background: color-mix(in srgb, var(--color--neutral-300) 45%, transparent);
		border-top-left-radius: var(--radius--lg);
		border-bottom-left-radius: var(--radius--lg);
		pointer-events: none;
	}

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}

	&.cardSelected {
		border-color: var(--color--warning);
		background-color: var(--color--foreground--tint-2);
	}

	@include dark-mode {
		background-color: var(--color--neutral-900);
		border-color: var(--color--neutral-800);

		&:hover {
			background-color: var(--color--neutral-850);
		}

		&.cardSelected {
			border-color: var(--color--warning);
			background-color: var(--color--neutral-850);
		}
	}
}

.cardResponse {
	margin-left: var(--spacing--xs);
}

.cardUser::before {
	background: color-mix(in srgb, var(--color--blue-400) 45%, transparent);
}

.cardAgent::before {
	background: color-mix(in srgb, var(--color--primary) 45%, transparent);
}

.cardTool::before {
	background: color-mix(in srgb, var(--color--success) 45%, transparent);
}

.cardSelected {
	// keep class for template binding
}

.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.cardHeaderLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.cardTime {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
	font-variant-numeric: tabular-nums;
	flex-shrink: 0;
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
	padding: var(--spacing--4xs) var(--spacing--2xs);
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

.badgeResumed {
	background-color: var(--color--primary--tint-2);
	color: var(--color--primary);
}

.detailPanel {
	flex: 4;
	overflow-y: auto;
	padding: var(--spacing--sm);

	@include dark-mode {
		background-color: var(--color--neutral-900);
	}
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
	color: var(--color--text--tint-1);
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
	line-height: var(--line-height--xl);
}

.emptyDetail {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-1);
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

<style lang="scss">
.agent-markdown {
	ul,
	ol {
		padding-left: var(--spacing--xl);
		margin: var(--spacing--3xs) 0;
	}

	p {
		margin: var(--spacing--3xs) 0;
	}

	p:first-child {
		margin-top: 0;
	}

	p:last-child {
		margin-bottom: 0;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
		margin: var(--spacing--2xs) 0 var(--spacing--4xs);
	}

	h1:first-child,
	h2:first-child,
	h3:first-child {
		margin-top: 0;
	}

	code {
		font-size: var(--font-size--3xs);
		background-color: var(--color--foreground--tint-1);
		padding: 1px var(--spacing--4xs);
		border-radius: var(--radius--sm);
	}

	pre {
		font-size: var(--font-size--3xs);
		background-color: var(--color--foreground--tint-1);
		padding: var(--spacing--2xs);
		border-radius: var(--radius);
		overflow-x: auto;
		margin: var(--spacing--3xs) 0;

		code {
			background: none;
			padding: 0;
		}
	}
}

.json-key {
	color: var(--color--primary);
}

.json-string {
	color: var(--color--success);
}

.json-number {
	color: var(--color--warning);
}

.json-bool {
	color: var(--color--text--tint-1);
	font-style: italic;
}
</style>
