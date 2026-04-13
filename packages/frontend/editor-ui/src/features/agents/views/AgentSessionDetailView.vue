<script lang="ts" setup>
import { useToast } from '@/app/composables/useToast';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import { AGENT_SESSIONS_LIST_VIEW } from '@/features/agents/constants';
import type { ThreadExecution } from '@/features/agents/composables/useAgentThreadsApi';
import type { ExecutionThread } from '@/features/agents/composables/useAgentThreadsApi';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

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
const selectedExecutionId = ref<string | null>(null);
const loading = ref(true);

onMounted(async () => {
	try {
		const result = await sessionsStore.getThreadDetail(
			projectId.value,
			threadId.value,
			agentId.value,
		);
		thread.value = result.thread;
		executions.value = result.executions;
		// Select first assistant message by default
		const firstAssistant = executions.value.find(
			(e) => getMetadata(e, 'assistantResponse') !== undefined,
		);
		if (firstAssistant) {
			selectedExecutionId.value = firstAssistant.id;
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	} finally {
		loading.value = false;
	}
});

function getMetadata(execution: ThreadExecution, key: string): string | undefined {
	return execution.metadata.find((m) => m.key === key)?.value;
}

const selectedExecution = computed(
	() => executions.value.find((e) => e.id === selectedExecutionId.value) ?? null,
);

const selectedIsSuspended = computed(
	() =>
		selectedExecution.value && getMetadata(selectedExecution.value, 'hitlStatus') === 'suspended',
);

const selectedToolCalls = computed(() => {
	if (!selectedExecution.value) return [];
	const raw = getMetadata(selectedExecution.value, 'toolCalls');
	if (!raw) return [];
	try {
		return JSON.parse(raw) as Array<{ name: string; input: unknown; output: unknown }>;
	} catch {
		return [];
	}
});

function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return text.slice(0, max) + '...';
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function executionDuration(execution: ThreadExecution): number {
	if (!execution.startedAt || !execution.stoppedAt) return 0;
	return new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime();
}

function highlightAgentName(text: string): string {
	if (!thread.value?.agentName) return escapeHtml(text);
	const escaped = escapeHtml(text);
	const name = escapeHtml(thread.value.agentName);
	return escaped.replace(new RegExp(`@${name}`, 'gi'), `<strong>@${name}</strong>`);
}

function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function goBack() {
	void router.push({
		name: AGENT_SESSIONS_LIST_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
	});
}
</script>

<template>
	<div :class="$style.detailView">
		<!-- Sub-header -->
		<div :class="$style.subHeader">
			<button :class="$style.backButton" @click="goBack">
				<N8nIcon icon="arrow-left" />
			</button>
			<span :class="$style.sessionTitle">Session {{ thread?.sessionNumber }}</span>
			<template v-if="thread">
				<span :class="$style.separator">·</span>
				<span :class="$style.sessionStat">
					{{ (thread.totalPromptTokens + thread.totalCompletionTokens).toLocaleString() }} tokens
				</span>
				<span :class="$style.separator">·</span>
				<span :class="$style.sessionStat">${{ thread.totalCost.toFixed(4) }}</span>
				<span :class="$style.separator">·</span>
				<span :class="$style.sessionStat">{{ formatDuration(thread.totalDuration) }}</span>
			</template>
		</div>

		<!-- Two panels -->
		<div :class="$style.panels">
			<!-- Chat panel -->
			<div :class="$style.chatPanel">
				<div v-if="loading" :class="$style.loadingState">Loading...</div>
				<template v-else>
					<template v-for="execution in executions" :key="execution.id">
						<!-- HITL suspension divider (shown before resumed messages) -->
						<div
							v-if="getMetadata(execution, 'hitlStatus') === 'resumed'"
							:class="$style.hitlDivider"
						>
							<span :class="$style.hitlDividerText">
								{{ i18n.baseText('agentSessions.detail.toolCallSuspended') }}
							</span>
						</div>
						<!-- User message (skipped for resumed executions with empty message) -->
						<!-- eslint-disable vue/no-v-html -- safe: highlightAgentName uses escapeHtml -->
						<div v-if="getMetadata(execution, 'userMessage')" :class="$style.userMessage">
							<div
								:class="$style.userBubble"
								v-html="highlightAgentName(getMetadata(execution, 'userMessage')!)"
							/>
						</div>
						<!-- Assistant message -->
						<div
							:class="[
								$style.assistantMessage,
								selectedExecutionId === execution.id && $style.selectedMessage,
							]"
							@click="selectedExecutionId = execution.id"
						>
							<div :class="$style.assistantBubble">
								{{
									getMetadata(execution, 'assistantResponse') ?? '(assistant response not recorded)'
								}}
							</div>
						</div>
					</template>
				</template>
			</div>

			<!-- Detail panel -->
			<div :class="$style.detailPanel">
				<template v-if="selectedExecution">
					<div :class="$style.detailTitle">
						{{ truncate(getMetadata(selectedExecution, 'assistantResponse') ?? '', 50) }}
					</div>
					<div :class="$style.detailSubtitle">
						{{ formatDuration(executionDuration(selectedExecution)) }}
						· {{ getMetadata(selectedExecution, 'model') ?? 'Unknown model' }}
					</div>

					<!-- Suspended notice -->
					<div v-if="selectedIsSuspended" :class="$style.suspendedNote">
						{{ i18n.baseText('agentSessions.detail.suspendedNote') }}
					</div>

					<!-- Token usage (hidden for suspended executions) -->
					<div v-if="!selectedIsSuspended" :class="$style.detailSection">
						<div :class="$style.sectionLabel">
							{{ i18n.baseText('agentSessions.detail.tokenUsage') }}
						</div>
						<div :class="$style.tokenCards">
							<div :class="$style.tokenCard">
								<div :class="$style.tokenCardLabel">
									{{ i18n.baseText('agentSessions.detail.input') }}
								</div>
								<div :class="$style.tokenCardValue">
									{{ Number(getMetadata(selectedExecution, 'promptTokens') ?? 0).toLocaleString() }}
								</div>
							</div>
							<div :class="$style.tokenCard">
								<div :class="$style.tokenCardLabel">
									{{ i18n.baseText('agentSessions.detail.output') }}
								</div>
								<div :class="$style.tokenCardValue">
									{{
										Number(getMetadata(selectedExecution, 'completionTokens') ?? 0).toLocaleString()
									}}
								</div>
							</div>
						</div>
					</div>

					<!-- Tool calls -->
					<div v-if="selectedToolCalls.length > 0" :class="$style.detailSection">
						<div :class="$style.sectionLabel">
							{{ i18n.baseText('agentSessions.detail.toolCalls') }} ({{ selectedToolCalls.length }})
						</div>
						<div v-for="(tc, idx) in selectedToolCalls" :key="idx" :class="$style.toolCallCard">
							<div :class="$style.toolCallName">{{ tc.name }}</div>
							<details v-if="tc.input !== undefined" :class="$style.toolCallDetails">
								<summary :class="$style.toolCallLabel">
									<N8nIcon icon="chevron-right" :class="$style.chevron" />
									Input
								</summary>
								<pre :class="$style.toolCallJson">{{ JSON.stringify(tc.input, null, 2) }}</pre>
							</details>
							<details v-if="tc.output !== undefined" :class="$style.toolCallDetails">
								<summary :class="$style.toolCallLabel">
									<N8nIcon icon="chevron-right" :class="$style.chevron" />
									Output
								</summary>
								<pre :class="$style.toolCallJson">{{ JSON.stringify(tc.output, null, 2) }}</pre>
							</details>
						</div>
					</div>

					<!-- Model -->
					<div :class="$style.detailSection">
						<div :class="$style.sectionLabel">
							{{ i18n.baseText('agentSessions.detail.model') }}
						</div>
						<div>{{ getMetadata(selectedExecution, 'model') ?? 'Unknown' }}</div>
					</div>

					<!-- Cost (hidden for suspended executions) -->
					<div v-if="!selectedIsSuspended" :class="$style.detailSection">
						<div :class="$style.sectionLabel">
							{{ i18n.baseText('agentSessions.detail.cost') }}
						</div>
						<div>${{ Number(getMetadata(selectedExecution, 'cost') ?? 0).toFixed(4) }}</div>
					</div>
				</template>
				<div v-else :class="$style.emptyDetail">
					{{ i18n.baseText('agentSessions.detail.selectMessage') }}
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.detailView {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.subHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--foreground--tint-2);
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

.separator {
	color: var(--color--text--tint-2);
}

.sessionStat {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.panels {
	display: flex;
	flex: 1;
	min-height: 0;
}

.chatPanel {
	flex: 6;
	overflow-y: auto;
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	border-right: var(--border-width) var(--border-style) var(--color--foreground);
}

.userMessage {
	display: flex;
	justify-content: flex-end;
}

.userBubble {
	max-width: 70%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius--lg) var(--radius--lg) var(--radius) var(--radius--lg);
	background-color: var(--color--foreground--shade-1);
	color: var(--color--text);
	font-size: var(--font-size--sm);
	white-space: pre-wrap;
}

.assistantMessage {
	display: flex;
	cursor: pointer;
}

.assistantBubble {
	max-width: 70%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius--lg) var(--radius--lg) var(--radius--lg) var(--radius);
	background-color: var(--color--foreground--tint-1);
	color: var(--color--text);
	font-size: var(--font-size--sm);
	white-space: pre-wrap;
	border: var(--border-width) var(--border-style) transparent;
	transition: border-color 0.15s;
}

.selectedMessage .assistantBubble {
	border-color: var(--color--primary);
	box-shadow: 0 0 8px color-mix(in srgb, var(--color--primary) 20%, transparent);
}

.detailPanel {
	flex: 4;
	overflow-y: auto;
	padding: var(--spacing--sm);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
}

.detailTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	margin-bottom: var(--spacing--4xs);
}

.detailSubtitle {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--sm);
}

.detailSection {
	margin-bottom: var(--spacing--sm);
}

.sectionLabel {
	font-size: var(--font-size--3xs);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--color--text--tint-2);
	margin-bottom: var(--spacing--3xs);
}

.tokenCards {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--3xs);
}

.tokenCard {
	background-color: var(--color--foreground--tint-1);
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	text-align: center;
}

.tokenCardLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
}

.tokenCardValue {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.toolCallCard {
	background-color: var(--color--foreground--tint-1);
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	border-left: 2px solid var(--color--primary);
	margin-bottom: var(--spacing--3xs);
}

.toolCallName {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--primary);
}

.toolCallDetails {
	margin-top: var(--spacing--3xs);
}

.toolCallDetails[open] .chevron {
	transform: rotate(90deg);
}

.toolCallLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	list-style: none;
	user-select: none;
}

.toolCallLabel::-webkit-details-marker {
	display: none;
}

.chevron {
	font-size: var(--font-size--3xs);
	transition: transform 0.15s;
}

.toolCallJson {
	background-color: var(--color--foreground--shade-1);
	padding: var(--spacing--3xs);
	border-radius: var(--radius--sm);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	margin: var(--spacing--4xs) 0;
	white-space: pre-wrap;
	overflow-x: auto;
}

.suspendedNote {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	background-color: var(--color--foreground--tint-1);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius);
	margin-bottom: var(--spacing--sm);
	font-style: italic;
}

.hitlDivider {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xs) 0;
}

.hitlDivider::before,
.hitlDivider::after {
	content: '';
	flex: 1;
	height: 1px;
	background-color: var(--color--foreground);
}

.hitlDividerText {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	white-space: nowrap;
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
