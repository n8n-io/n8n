<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { ExecutionSummary, ExecutionStatus, ITaskData } from 'n8n-workflow';

import { VIEWS } from '@/app/constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import JsonEditor from '@/features/shared/editors/components/JsonEditor/JsonEditor.vue';
import type { SingleNodeExecutionSummaryExtras } from '../../executions.types';
import { CALLER_SOURCE_LABEL, formatSessionShortId } from '../../executions.utils';
import SingleNodeExecutionSiblingRail from './SingleNodeExecutionSiblingRail.vue';

type WorkflowNode = { name: string; type: string; parameters?: unknown };

const props = defineProps<{
	execution: ExecutionSummary & SingleNodeExecutionSummaryExtras & { credentialId?: string };
	runData: Record<string, ITaskData[]> | undefined;
	executedNodeName: string;
	workflowNodes?: WorkflowNode[];
}>();

const locale = useI18n();
const credentialsStore = useCredentialsStore();
const router = useRouter();

const title = computed(
	() =>
		props.execution.actionDisplayName ??
		props.execution.actionId ??
		props.execution.nodeType ??
		props.execution.id ??
		'',
);

const callerKind = computed(() => props.execution.caller?.kind);
const callerName = computed(() => props.execution.caller?.name);
const sessionId = computed(() => props.execution.caller?.sessionId);

const callerKindLabel = computed(() => {
	const kind = callerKind.value;
	if (!kind) return '';
	return CALLER_SOURCE_LABEL[kind] ?? kind.toUpperCase();
});

const status = computed<ExecutionStatus | undefined>(() => props.execution.status);

const statusIcon = computed(() => {
	switch (status.value) {
		case 'success':
			return 'circle-check';
		case 'error':
		case 'crashed':
			return 'circle-x';
		case 'running':
		case 'new':
			return 'circle-ellipsis';
		case 'waiting':
			return 'clock';
		case 'canceled':
			return 'circle-x';
		default:
			return 'circle-ellipsis';
	}
});

const statusClass = computed(() => {
	switch (status.value) {
		case 'success':
			return 'status-success';
		case 'error':
		case 'crashed':
		case 'canceled':
			return 'status-error';
		case 'waiting':
			return 'status-warning';
		default:
			return 'status-neutral';
	}
});

const statusLabel = computed(() => {
	const s = status.value;
	if (!s) return '';
	return s.charAt(0).toUpperCase() + s.slice(1);
});

const durationLabel = computed(() => {
	const started = props.execution.startedAt
		? new Date(props.execution.startedAt).getTime()
		: undefined;
	const stopped = props.execution.stoppedAt
		? new Date(props.execution.stoppedAt).getTime()
		: undefined;
	if (!started || !stopped || stopped < started) return '';
	return locale.displayTimer(stopped - started, true);
});

const credentialInfo = computed<{ id: string; name?: string; deleted: boolean } | null>(() => {
	const credId = props.execution.credentialId;
	if (!credId) return null;
	const cred = credentialsStore.getCredentialById(credId);
	return {
		id: credId,
		name: cred?.name,
		deleted: !cred,
	};
});

const taskRun = computed<ITaskData | undefined>(() => {
	const runs = props.runData?.[props.executedNodeName];
	if (!runs || runs.length === 0) return undefined;
	return runs[0];
});

/**
 * The "action" node in a Hub single-node execution. The placeholder workflow
 * is `[Trigger, Action]`; we want the `Action` node so we can render its
 * configured parameters as the input panel. Falls back to the first non-trigger
 * node when names differ, then to the last node as a final safety net.
 */
const actionNode = computed<WorkflowNode | undefined>(() => {
	const nodes = props.workflowNodes;
	if (!nodes || nodes.length === 0) return undefined;
	const byName = nodes.find((n) => n.name === props.executedNodeName);
	if (byName) return byName;
	const nonTrigger = nodes.find((n) => !/trigger/i.test(n.type));
	return nonTrigger ?? nodes[nodes.length - 1];
});

/**
 * Output items emitted by the action node. Most single-node executions produce
 * one main branch; multi-branch nodes keep the branch shape so each is
 * inspectable in the rendered JSON.
 */
const outputItems = computed<unknown>(() => {
	const run = taskRun.value;
	if (!run?.data?.main) return undefined;
	const branches = run.data.main.filter(Boolean);
	if (branches.length === 0) return undefined;
	if (branches.length === 1) return branches[0];
	return branches;
});

const inputParameters = computed<unknown>(() => actionNode.value?.parameters);

const inputJson = computed(() => stringifyOrEmpty(inputParameters.value));
const outputJson = computed(() => stringifyOrEmpty(outputItems.value));

function stringifyOrEmpty(value: unknown): string {
	if (value === undefined) return '';
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function onSessionChipClick() {
	if (!sessionId.value) return;
	void router.push({
		query: {
			...router.currentRoute.value.query,
			metadata: `caller.sessionId=${sessionId.value}`,
		},
	});
}
</script>

<template>
	<section :class="$style.detail" data-test-id="single-node-execution-detail">
		<header :class="$style.titleRow">
			<N8nText :class="$style.title" tag="h2" size="large" bold>{{ title }}</N8nText>
		</header>

		<div :class="$style.callerBar" data-test-id="single-node-execution-callerbar">
			<span v-if="status" :class="[$style.prop, $style[statusClass]]">
				<N8nIcon :icon="statusIcon" size="xsmall" />
				<span :class="$style.label">{{ statusLabel }}</span>
			</span>
			<span v-if="durationLabel" :class="$style.prop">
				<N8nIcon icon="clock" size="xsmall" />
				<span :class="$style.label">{{ durationLabel }}</span>
			</span>
			<span v-if="callerKind" :class="$style.prop">
				<span :class="[$style.kindLabel, $style[`kind-${callerKind}`]]">
					{{ callerKindLabel }}
				</span>
				<span v-if="callerName" :class="$style.label">{{ callerName }}</span>
			</span>
			<button
				v-if="sessionId"
				type="button"
				:class="[$style.prop, $style.propClickable]"
				:title="sessionId"
				data-test-id="executions-session-chip"
				@click="onSessionChipClick"
			>
				<N8nIcon icon="hash" size="xsmall" />
				<span :class="[$style.label, $style.mono]">
					{{ formatSessionShortId(sessionId, 20) }}
				</span>
			</button>
			<RouterLink
				v-if="credentialInfo && !credentialInfo.deleted"
				:to="{ name: VIEWS.CREDENTIALS, params: { credentialId: credentialInfo.id } }"
				:class="[$style.prop, $style.propClickable, $style.propLink]"
				:title="credentialInfo.name ?? credentialInfo.id"
				data-test-id="single-node-execution-credential"
			>
				<N8nIcon icon="key" size="xsmall" />
				<span :class="$style.label">{{ credentialInfo.name ?? credentialInfo.id }}</span>
			</RouterLink>
			<span
				v-else-if="credentialInfo"
				:class="$style.prop"
				data-test-id="single-node-execution-credential"
			>
				<N8nIcon icon="key" size="xsmall" />
				<span :class="$style.label">
					{{ locale.baseText('executionDetails.singleNode.credentialDeleted') }}
				</span>
			</span>
		</div>

		<div :class="$style.body">
			<SingleNodeExecutionSiblingRail
				v-if="sessionId"
				:session-id="sessionId"
				:current-execution-id="execution.id"
			/>
			<div :class="$style.panes">
				<div :class="$style.pane" data-test-id="single-node-execution-input">
					<N8nText :class="$style.paneLabel" size="xsmall" color="text-light" bold>
						{{ locale.baseText('executionDetails.singleNode.inputLabel') }}
					</N8nText>
					<div v-if="inputJson" :class="$style.editor">
						<JsonEditor
							:model-value="inputJson"
							is-read-only
							fill-parent
							data-test-id="single-node-execution-input-json"
						/>
					</div>
					<N8nText v-else size="small" color="text-light">
						{{ locale.baseText('executionDetails.singleNode.inputEmpty') }}
					</N8nText>
				</div>
				<div :class="$style.pane" data-test-id="single-node-execution-output">
					<N8nText :class="$style.paneLabel" size="xsmall" color="text-light" bold>
						{{ locale.baseText('executionDetails.singleNode.outputLabel') }}
					</N8nText>
					<div v-if="outputJson" :class="$style.editor">
						<JsonEditor
							:model-value="outputJson"
							is-read-only
							fill-parent
							data-test-id="single-node-execution-output-json"
						/>
					</div>
					<N8nText v-else size="small" color="text-light">
						{{ locale.baseText('executionDetails.singleNode.outputEmpty') }}
					</N8nText>
				</div>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
.detail {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	background: var(--background--surface);
}

.titleRow {
	padding: var(--spacing--sm) var(--spacing--md) var(--spacing--2xs);
	background: var(--background--surface);
}

.title {
	margin: 0;
	color: var(--text-color);
}

.callerBar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--md) var(--spacing--sm);
	background: var(--background--surface);
	border-bottom: var(--border-width--base) solid var(--border-color);
}

.prop {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: 24px;
	padding: 0 var(--spacing--xs);
	border: var(--border-width--base) solid var(--border-color--subtle);
	border-radius: var(--radius);
	background: var(--background--subtle);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	line-height: 1;
	max-width: 18rem;
	text-decoration: none;
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.mono {
	font-family: var(--font-family--mono);
}

.propClickable {
	cursor: pointer;
	transition:
		background-color 120ms ease,
		border-color 120ms ease;

	&:hover {
		background: var(--background--hover);
		border-color: var(--border-color);
	}

	&:focus-visible {
		outline: var(--focus--outline-color) solid var(--focus--border-width);
		outline-offset: 1px;
	}
}

.propLink {
	color: var(--color--primary);

	&:hover {
		color: var(--color--primary);
	}
}

.status-success {
	border-color: var(--border-color--success);
	background: var(--background--success);
	color: var(--text-color--success);

	:global(.n8n-icon) {
		color: var(--icon-color--success);
	}
}

.status-error {
	border-color: var(--border-color--danger);
	background: var(--background--danger);
	color: var(--text-color--danger);

	:global(.n8n-icon) {
		color: var(--icon-color--danger);
	}
}

.status-warning {
	border-color: var(--border-color--warning);
	background: var(--background--warning);
	color: var(--text-color--warning);

	:global(.n8n-icon) {
		color: var(--icon-color--warning);
	}
}

.status-neutral {
	color: var(--text-color--subtle);
}

.body {
	display: flex;
	flex: 1;
	min-height: 0;
	background: var(--background--surface);
}

.panes {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--md);
	flex: 1;
	min-width: 0;
	min-height: 0;
	padding: var(--spacing--md);
}

.pane {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	min-height: 0;
}

.paneLabel {
	text-transform: uppercase;
	letter-spacing: 0.5px;
	padding-left: var(--spacing--3xs);
}

.editor {
	flex: 1 1 0;
	min-height: 0;
	border: var(--border-width--base) solid var(--border-color);
	border-radius: var(--radius);
	background: var(--background--surface);
	overflow: auto;
}

.kindLabel {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.04em;
	padding: 1px var(--spacing--4xs);
	border-radius: var(--radius);
	line-height: 1.4;
	flex-shrink: 0;
}

.kind-mcp {
	background: var(--color--primary--tint-2);
	color: var(--color--primary--shade-1);
}

.kind-cli {
	background: var(--color--success--tint-2);
	color: var(--color--success--shade-1);
}

.kind-sdk {
	background: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
}

.kind-instance-ai {
	background: var(--color--secondary--tint-2);
	color: var(--color--secondary--shade-1);
}
</style>
