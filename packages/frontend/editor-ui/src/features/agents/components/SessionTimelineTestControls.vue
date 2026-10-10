<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nCheckbox } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { TimelineActivityStatus, TimelineItem } from '../session-timeline.types';

/** Temporary display fixtures. Remove this file and the panel integration after testing. */
const emit = defineEmits<{ update: [items: TimelineItem[] | null] }>();
const i18n = useI18n();
const enabled = ref(false);
const empty = ref(false);
const start = Date.now() - 600_000;
const states: TimelineActivityStatus[] = [
	'running',
	'waiting',
	'completed',
	'failed',
	'interrupted',
];
const selectedStates = ref(new Set(states));

const types = [
	{
		key: 'user',
		label: 'agentSessions.timeline.user',
		item: {
			kind: 'user',
			authorName: 'Alex',
			content: 'Summarize the project status.',
			attachments: [
				{ id: 'sample-file', fileName: 'report.txt', mimeType: 'text/plain', sizeBytes: 128 },
			],
		},
	},
	{
		key: 'agent',
		label: 'agentSessions.timeline.agent',
		item: {
			kind: 'agent',
			content:
				'## Project status\n\nThe project is ready for review.\n\n- Tasks are complete\n- Approval is pending',
		},
	},
	{
		key: 'skill',
		label: 'agentSessions.timeline.skill',
		item: { kind: 'skill', toolName: 'load_skill', skillName: 'Project summary' },
	},
	{
		key: 'tool',
		label: 'agentSessions.timeline.tool',
		item: { kind: 'tool', toolName: 'search_documents' },
	},
	{
		key: 'subagent',
		label: 'agentSessions.timeline.subAgent',
		item: { kind: 'tool', toolName: 'delegate_subagent', subAgentName: 'Research agent' },
	},
	{
		key: 'node',
		label: 'agentSessions.timeline.node',
		item: {
			kind: 'node',
			toolName: 'http_request',
			nodeDisplayName: 'HTTP Request',
			nodeType: 'n8n-nodes-base.httpRequest',
			nodeTypeVersion: 4.2,
			nodeParameters: { method: 'GET', url: 'https://example.com' },
		},
	},
	{
		key: 'workflow',
		label: 'agentSessions.timeline.workflow',
		item: { kind: 'workflow', toolName: 'run_workflow', workflowName: 'Project report' },
	},
	{
		key: 'execution-error',
		label: 'agentSessions.timeline.executionFailed',
		item: {
			kind: 'execution-error',
			content:
				'The HTTP Request node could not connect to the server. Check the connection and try again.',
		},
	},
	{
		key: 'suspension',
		label: 'agentSessions.timeline.hitlRequest',
		item: { kind: 'suspension', hitlToolDisplayName: 'Send report' },
	},
	{
		key: 'hitl-response',
		label: 'agentSessions.timeline.hitlResponse',
		item: { kind: 'hitl-response', hitlToolDisplayName: 'Send report' },
	},
	{
		key: 'background-task-signal',
		label: 'agentSessions.timeline.testControls.background',
		item: { kind: 'background-task-signal' },
	},
] satisfies Array<{
	key: string;
	label: Parameters<typeof i18n.baseText>[0];
	item: Omit<TimelineItem, 'executionId' | 'timestamp'>;
}>;
const selectedTypes = ref(
	new Set(['user', 'skill', 'tool', 'subagent', 'node', 'workflow', 'agent']),
);

function toggle<T>(selection: Set<T>, value: T, checked: boolean) {
	if (checked) selection.add(value);
	else selection.delete(value);
}

const samples = computed<TimelineItem[]>(function buildSamples() {
	if (!enabled.value || empty.value) return [];
	const result: TimelineItem[] = [];
	const capabilityStates: Record<string, TimelineActivityStatus> = {
		skill: 'completed',
		tool: 'running',
		subagent: 'waiting',
		node: 'failed',
		workflow: 'interrupted',
	};
	const orderedTypes = [...types.filter((type) => type.key !== 'agent'), types[1]];
	for (const type of orderedTypes) {
		if (!selectedTypes.value.has(type.key)) continue;
		const state = capabilityStates[type.key];
		if (state && !selectedStates.value.has(state)) continue;
		const item: TimelineItem = {
			...type.item,
			executionId: 'timeline-test',
			toolCallId: `sample-${type.key}`,
			timestamp: start,
		};
		if (state) {
			item.activityStatus = state;
			item.toolInput = { query: 'Project status' };
			if (state === 'completed' || state === 'failed') {
				item.toolOutcome = state === 'failed' ? 'error' : 'success';
				item.toolOutput =
					state === 'failed'
						? { error: 'The request failed. Check the connection and try again.' }
						: { summary: 'All tasks are complete.', count: 3 };
			}
		}
		if (!state || (state !== 'running' && state !== 'waiting')) {
			item.endTimestamp = start + 1_000;
		}
		if (item.kind === 'execution-error') {
			item.executionStatus = 'error';
		}
		if (item.kind === 'suspension') {
			item.hitlRequestType = 'approval';
			item.hitlRequest = { question: 'Send the project report?' };
			item.activityStatus = 'waiting';
		}
		if (item.kind === 'hitl-response') {
			item.hitlRequestType = 'approval';
			item.hitlResponseStatus = 'approved';
			item.hitlResponse = { response: 'approved' };
		}
		if (item.kind === 'background-task-signal') {
			item.backgroundJobSignal = {
				tasks: [
					{
						id: 'sample-completed',
						title: 'Project research',
						kind: 'subagent',
						status: 'completed',
					},
				],
			};
		}
		result.push(item);
	}
	return result.map((item, index) => {
		const timestamp = start + index * 2_000;
		return {
			...item,
			timestamp,
			endTimestamp: item.endTimestamp === undefined ? undefined : timestamp + 1_000,
		};
	});
});

watch(
	[enabled, samples],
	function publishSamples() {
		emit('update', enabled.value ? samples.value : null);
	},
	{ immediate: true },
);
</script>

<template>
	<details :class="$style.controls">
		<summary>{{ i18n.baseText('agentSessions.timeline.testControls.title') }}</summary>
		<div :class="$style.options">
			<N8nCheckbox
				v-model="enabled"
				:label="i18n.baseText('agentSessions.timeline.testControls.enable')"
			/>
			<N8nCheckbox
				v-model="empty"
				:label="i18n.baseText('agentSessions.timeline.testControls.empty')"
				:disabled="!enabled"
			/>
		</div>
		<fieldset :disabled="!enabled">
			<legend>{{ i18n.baseText('agentSessions.timeline.testControls.types') }}</legend>
			<div :class="$style.options">
				<N8nCheckbox
					v-for="type in types"
					:key="type.key"
					:model-value="selectedTypes.has(type.key)"
					:label="i18n.baseText(type.label)"
					:disabled="!enabled"
					@update:model-value="toggle(selectedTypes, type.key, $event)"
				/>
			</div>
		</fieldset>
		<fieldset :disabled="!enabled">
			<legend>{{ i18n.baseText('agentSessions.timeline.status') }}</legend>
			<div :class="$style.options">
				<N8nCheckbox
					v-for="state in states"
					:key="state"
					:model-value="selectedStates.has(state)"
					:label="i18n.baseText(`agentSessions.timeline.testControls.${state}`)"
					:disabled="!enabled"
					@update:model-value="toggle(selectedStates, state, $event)"
				/>
			</div>
		</fieldset>
	</details>
</template>

<style module lang="scss">
.controls {
	flex-shrink: 0;
	padding: var(--spacing--xs);
	background: var(--background--surface);
	border-bottom: var(--border);
	font-size: var(--font-size--2xs);
	max-height: 35%;
	overflow: auto;

	summary {
		cursor: pointer;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin-block: var(--spacing--xs);
	}
}
.options {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
	margin-block: var(--spacing--xs);
}
</style>
