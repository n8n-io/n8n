<script lang="ts" setup>
import { ref, computed, watch, inject } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import type { IWorkflowDb } from '@/Interface';
import WorkflowMiniCanvas from './WorkflowMiniCanvas.vue';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import ExecutionPreviewCard from './ExecutionPreviewCard.vue';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useInstanceAiStore } from '../instanceAi.store';
import { getRenderableAgentResult } from '../agentResult';
import AgentTimeline from './AgentTimeline.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const instanceAiStore = useInstanceAiStore();
const openWorkflowPreview = inject<((workflowId: string) => void) | undefined>(
	'openWorkflowPreview',
	undefined,
);

function handleOpenWorkflow(event: MouseEvent, workflowId: string) {
	event.preventDefault();
	if (event.ctrlKey || event.metaKey) {
		window.open(`/workflow/${workflowId}`, '_blank');
	} else if (openWorkflowPreview) {
		openWorkflowPreview(workflowId);
	}
}

function handleStop() {
	instanceAiStore.amendAgent(props.agentNode.agentId, props.agentNode.role, props.agentNode.taskId);
}

const i18n = useI18n();
const workflowsListStore = useWorkflowsListStore();
const isDetailOpen = ref(false);
const previewWorkflows = ref<Map<string, IWorkflowDb>>(new Map());
const workflowModalId = ref<string | null>(null);

interface PhaseState {
	key: string;
	label: string;
	count: number;
	completedCount: number;
	isActive: boolean;
	isCompleted: boolean;
}

const phases = computed((): PhaseState[] => {
	const tc = props.agentNode.toolCalls;
	const result: PhaseState[] = [];

	const searchCalls = tc.filter((t) => t.toolName === 'search-nodes');
	if (searchCalls.length > 0) {
		result.push({
			key: 'researching',
			label: i18n.baseText('instanceAi.builderCard.phase.researching'),
			count: searchCalls.length,
			completedCount: searchCalls.filter((t) => !t.isLoading).length,
			isActive: searchCalls.some((t) => t.isLoading),
			isCompleted: searchCalls.every((t) => !t.isLoading),
		});
	}

	const schemaCalls = tc.filter(
		(t) => t.toolName === 'get-node-type-definition' || t.toolName === 'get-workflow-as-code',
	);
	if (schemaCalls.length > 0) {
		result.push({
			key: 'schemas',
			label: i18n.baseText('instanceAi.builderCard.phase.schemas'),
			count: schemaCalls.length,
			completedCount: schemaCalls.filter((t) => !t.isLoading).length,
			isActive: schemaCalls.some((t) => t.isLoading),
			isCompleted: schemaCalls.every((t) => !t.isLoading),
		});
	}

	const buildCalls = tc.filter(
		(t) => t.toolName === 'build-workflow' || t.toolName === 'submit-workflow',
	);
	if (buildCalls.length > 0) {
		result.push({
			key: 'building',
			label: i18n.baseText('instanceAi.builderCard.phase.building'),
			count: buildCalls.length,
			completedCount: buildCalls.filter((t) => !t.isLoading).length,
			isActive: buildCalls.some((t) => t.isLoading),
			isCompleted: buildCalls.every((t) => !t.isLoading),
		});
	}

	const runCalls = tc.filter((t) => t.toolName === 'run-workflow');
	if (runCalls.length > 0) {
		result.push({
			key: 'testing',
			label: 'Testing',
			count: runCalls.length,
			completedCount: runCalls.filter((t) => !t.isLoading).length,
			isActive: runCalls.some((t) => t.isLoading),
			isCompleted: runCalls.every((t) => !t.isLoading),
		});
	}

	return result;
});

interface BuildResultItem {
	success: boolean;
	workflowId?: string;
	workflowName?: string;
	errors?: string[];
}

const buildResults = computed((): BuildResultItem[] => {
	return props.agentNode.toolCalls
		.filter((t) => t.toolName === 'build-workflow' || t.toolName === 'submit-workflow')
		.filter((t) => t.result && typeof t.result === 'object')
		.map((t) => {
			const result = t.result as Record<string, unknown>;
			return {
				success: result.success === true,
				workflowId: typeof result.workflowId === 'string' ? result.workflowId : undefined,
				workflowName: typeof result.workflowName === 'string' ? result.workflowName : undefined,
				errors: Array.isArray(result.errors) ? (result.errors as string[]) : undefined,
			};
		});
});

/** The last build result — used for overall status (header icon, agent-level error). */
const lastBuildResult = computed(() => buildResults.value.at(-1));

/** Only the successful submissions that produced a workflow. */
const successfulBuilds = computed(() =>
	buildResults.value.filter((r) => r.success && r.workflowId),
);

/** Map from toolCallId → { workflowId, workflowName } for successful submit-workflow calls. */
const submitResults = computed(() => {
	const map = new Map<string, { workflowId: string; workflowName?: string }>();
	for (const tc of props.agentNode.toolCalls) {
		if (
			(tc.toolName === 'build-workflow' || tc.toolName === 'submit-workflow') &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			if (result.success === true && typeof result.workflowId === 'string') {
				map.set(tc.toolCallId, {
					workflowId: result.workflowId,
					workflowName: typeof result.workflowName === 'string' ? result.workflowName : undefined,
				});
			}
		}
	}
	return map;
});

/** Map from toolCallId → { executionId, workflowId, status } for completed run-workflow calls. */
const runResults = computed(() => {
	const map = new Map<
		string,
		{ executionId: string; workflowId: string; status: string; error?: string }
	>();
	for (const tc of props.agentNode.toolCalls) {
		if (tc.toolName === 'run-workflow' && tc.result && typeof tc.result === 'object') {
			const result = tc.result as Record<string, unknown>;
			const args = tc.args as Record<string, unknown>;
			if (typeof result.executionId === 'string' && typeof args.workflowId === 'string') {
				map.set(tc.toolCallId, {
					executionId: result.executionId,
					workflowId: args.workflowId,
					status: typeof result.status === 'string' ? result.status : 'unknown',
					error: typeof result.error === 'string' ? result.error : undefined,
				});
			}
		}
	}
	return map;
});

const isActive = computed(() => props.agentNode.status === 'active');
const isError = computed(
	() =>
		props.agentNode.status === 'error' || (lastBuildResult.value && !lastBuildResult.value.success),
);
const displayResult = computed(() => getRenderableAgentResult(props.agentNode));

// Fetch workflow preview for every successful submit.
// Keyed by toolCallId (not workflowId) so each submit gets its own snapshot —
// the same workflow may be submitted multiple times (updates), and each version
// should render independently in the preview.
watch(
	() => props.agentNode.toolCalls.filter((t) => !t.isLoading && t.result).length,
	async () => {
		for (const [toolCallId, entry] of submitResults.value) {
			if (!entry.workflowId || previewWorkflows.value.has(toolCallId)) continue;
			try {
				const wf = await workflowsListStore.fetchWorkflow(entry.workflowId);
				previewWorkflows.value.set(toolCallId, wf);
			} catch {
				// Preview is non-critical — silently skip if fetch fails
			}
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.root">
		<!-- Header -->
		<div :class="$style.header">
			<div :class="$style.headerLeft">
				<N8nIcon v-if="isActive" icon="spinner" spin size="small" :class="$style.activeIcon" />
				<N8nIcon v-else-if="isError" icon="triangle-alert" size="small" :class="$style.errorIcon" />
				<N8nIcon v-else icon="check" size="small" :class="$style.successIcon" />
				<span :class="$style.title">{{ i18n.baseText('instanceAi.builderCard.title') }}</span>
				<span v-if="props.agentNode.subtitle" :class="$style.subtitle">
					{{ props.agentNode.subtitle }}
				</span>
			</div>
			<button v-if="isActive" :class="$style.stopButton" @click="handleStop">
				<N8nIcon icon="square" size="small" />
				{{ i18n.baseText('instanceAi.agent.stop') }}
			</button>
		</div>

		<!-- Phase Timeline -->
		<div v-if="phases.length > 0" :class="$style.timeline">
			<div
				v-for="phase in phases"
				:key="phase.key"
				:class="[
					$style.phase,
					phase.isActive ? $style.phaseActive : '',
					phase.isCompleted ? $style.phaseCompleted : '',
				]"
			>
				<N8nIcon v-if="phase.isActive" icon="spinner" spin size="small" :class="$style.phaseIcon" />
				<N8nIcon
					v-else-if="phase.isCompleted"
					icon="check"
					size="small"
					:class="$style.phaseIconDone"
				/>
				<N8nIcon v-else icon="circle" size="small" :class="$style.phaseIconPending" />
				<span :class="$style.phaseLabel">
					{{ phase.label }}
					<span v-if="phase.count > 1" :class="$style.phaseCount">
						({{ phase.completedCount }}/{{ phase.count }})
					</span>
				</span>
			</div>
		</div>

		<!-- Tool calls with inline workflow previews -->
		<CollapsibleRoot
			v-if="props.agentNode.toolCalls.length > 0"
			v-model:open="isDetailOpen"
			:class="$style.detailBlock"
		>
			<CollapsibleTrigger :class="$style.detailTrigger">
				<span>{{ i18n.baseText('instanceAi.builderCard.details') }}</span>
				<N8nIcon :icon="isDetailOpen ? 'chevron-up' : 'chevron-down'" size="small" />
			</CollapsibleTrigger>
			<CollapsibleContent :class="$style.detailContent">
				<AgentTimeline :agent-node="props.agentNode" :compact="true">
					<template #after-tool-call="{ toolCall: tc }">
						<!-- Inline workflow preview after successful submit-workflow -->
						<div
							v-if="submitResults.has(tc.toolCallId) && previewWorkflows.has(tc.toolCallId)"
							:class="$style.previewBlock"
						>
							<div :class="$style.previewHeader">
								<N8nIcon icon="check" size="small" :class="$style.successIcon" />
								<span :class="$style.previewName">
									{{
										submitResults.get(tc.toolCallId)!.workflowName ??
										i18n.baseText('instanceAi.builderCard.success')
									}}
								</span>
								<button :class="$style.workflowLink" @click="workflowModalId = tc.toolCallId">
									Details
									<N8nIcon icon="expand" size="small" />
								</button>
								<a
									:href="`/workflow/${submitResults.get(tc.toolCallId)!.workflowId}`"
									target="_blank"
									:class="$style.workflowLink"
								>
									Open
									<N8nIcon icon="external-link" size="small" />
								</a>
							</div>
							<div :class="$style.previewCanvas">
								<WorkflowMiniCanvas
									:workflow="previewWorkflows.get(tc.toolCallId)!"
									:canvas-id="`builder-preview-${tc.toolCallId}`"
								/>
							</div>
						</div>

						<!-- Inline execution preview after run-workflow -->
						<ExecutionPreviewCard
							v-if="runResults.has(tc.toolCallId)"
							:execution-id="runResults.get(tc.toolCallId)!.executionId"
							:workflow-id="runResults.get(tc.toolCallId)!.workflowId"
							:status="runResults.get(tc.toolCallId)!.status"
							:error="runResults.get(tc.toolCallId)!.error"
						/>
					</template>
				</AgentTimeline>
			</CollapsibleContent>
		</CollapsibleRoot>

		<!-- Success summary (visible when details are collapsed) -->
		<template v-if="!isDetailOpen">
			<template v-for="build in successfulBuilds" :key="`summary-${build.workflowId}`">
				<div :class="$style.successResult">
					<N8nIcon icon="check" size="small" :class="$style.successIcon" />
					<span>{{ build.workflowName ?? i18n.baseText('instanceAi.builderCard.success') }}</span>
					<a
						v-if="build.workflowId"
						:href="`/workflow/${build.workflowId}`"
						:class="$style.workflowLink"
						@click="handleOpenWorkflow($event, build.workflowId)"
					>
						{{ i18n.baseText('instanceAi.builderCard.openWorkflow') }}
						<N8nIcon icon="external-link" size="small" />
					</a>
				</div>
			</template>
		</template>

		<!-- Build Error (last result only) -->
		<div v-if="lastBuildResult && !lastBuildResult.success" :class="$style.errorResult">
			<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
			<div :class="$style.errorDetails">
				<span>{{ i18n.baseText('instanceAi.builderCard.failed') }}</span>
				<ul v-if="lastBuildResult.errors" :class="$style.errorList">
					<li v-for="(err, idx) in lastBuildResult.errors" :key="idx">{{ err }}</li>
				</ul>
			</div>
		</div>

		<!-- Agent-level error -->
		<div v-if="props.agentNode.error && !lastBuildResult" :class="$style.errorResult">
			<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
			<span>{{ props.agentNode.error }}</span>
		</div>

		<div v-if="displayResult && !props.agentNode.error" :class="$style.resultBlock">
			<InstanceAiMarkdown :content="displayResult" />
		</div>

		<!-- Workflow detail modal (iframe-based, full NDV support) -->
		<Teleport to="body">
			<div
				v-if="workflowModalId && previewWorkflows.has(workflowModalId)"
				:class="$style.modalOverlay"
				@click.self="workflowModalId = null"
			>
				<div :class="$style.modalContent">
					<div :class="$style.modalHeader">
						<span :class="$style.modalTitle">Workflow details</span>
						<button :class="$style.modalClose" @click="workflowModalId = null">
							<N8nIcon icon="x" size="medium" />
						</button>
					</div>
					<div :class="$style.modalBody">
						<WorkflowPreview
							mode="workflow"
							:workflow="previewWorkflows.get(workflowModalId)!"
							:can-open-ndv="true"
							:hide-controls="true"
							:tidy-up="true"
							loader-type="spinner"
						/>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
	background: var(--color--background);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
}

.title {
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.subtitle {
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--regular);
	max-width: 280px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.timeline {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--xs) var(--spacing--2xs);
}

.phase {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.phaseActive {
	color: var(--color--primary);
}

.phaseCompleted {
	color: var(--color--success);
}

.phaseIcon {
	color: var(--color--primary);
}

.phaseIconDone {
	color: var(--color--success);
}

.phaseIconPending {
	color: var(--color--text--tint-1);
}

.phaseLabel {
	white-space: nowrap;
}

.phaseCount {
	font-weight: var(--font-weight--regular);
	opacity: 0.7;
}

.detailBlock {
	border-top: var(--border);
}

.detailTrigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--xs);
	background: none;
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.detailContent {
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.successResult {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border-top: var(--border);
	background: color-mix(in srgb, var(--color--success) 10%, var(--color--background));
	font-size: var(--font-size--2xs);
	color: var(--color--success);
	animation: successPulse 0.6s ease-out;
}

@keyframes successPulse {
	0% {
		background-color: color-mix(in srgb, var(--color--success) 18%, var(--color--background));
	}
	50% {
		background-color: color-mix(in srgb, var(--color--success) 18%, var(--color--background));
	}
	100% {
		background-color: color-mix(in srgb, var(--color--success) 10%, var(--color--background));
	}
}

.workflowLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--color--primary);
	text-decoration: none;
	font-family: var(--font-family);
	font-size: inherit;
	font-weight: var(--font-weight--bold);
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;

	&:first-of-type {
		margin-left: auto;
	}

	&:hover {
		text-decoration: underline;
	}
}

.previewBlock {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--3xs) 0 var(--spacing--2xs);
	overflow: hidden;
	background: var(--color--background);
}

.previewHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: color-mix(in srgb, var(--color--success) 10%, var(--color--background));
	font-size: var(--font-size--2xs);
	color: var(--color--success);
}

.previewName {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: var(--font-weight--bold);
}

.errorResult {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border-top: var(--border);
	background: color-mix(in srgb, var(--color--danger) 10%, var(--color--background));
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
}

.errorDetails {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.resultBlock {
	padding: var(--spacing--xs);
	border-top: var(--border);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}

.errorList {
	margin: 0;
	padding-left: var(--spacing--sm);
	font-size: var(--font-size--3xs);
	font-family: monospace;
}

.stopButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	font-family: var(--font-family);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--danger);
	background: color-mix(in srgb, var(--color--danger) 10%, var(--color--background));
	border: var(--border-width) var(--border-style) var(--color--danger);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background: color-mix(in srgb, var(--color--danger) 18%, var(--color--background));
	}
}

.activeIcon {
	color: var(--color--primary);
}

.successIcon {
	color: var(--color--success);
}

.errorIcon {
	color: var(--color--danger);
}

.modalOverlay {
	position: fixed;
	inset: 0;
	z-index: 10000;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgb(0 0 0 / 50%);
}

.modalContent {
	display: flex;
	flex-direction: column;
	width: 90vw;
	height: 85vh;
	max-width: 1200px;
	background: var(--color--background);
	border-radius: var(--radius--xl);
	overflow: hidden;
	box-shadow: 0 20px 60px rgb(0 0 0 / 30%);
}

.modalHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.modalTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.modalClose {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	background: none;
	border: none;
	border-radius: var(--radius);
	cursor: pointer;
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.modalBody {
	flex: 1;
	position: relative;
	overflow: hidden;
}
</style>
