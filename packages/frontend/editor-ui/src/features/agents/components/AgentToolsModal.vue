<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { DEBOUNCE_TIME, getDebounceTime, MODAL_CONFIRM } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import { N8nHeading, N8nIcon, N8nInput, N8nText, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDebounceFn } from '@vueuse/core';
import { NodeConnectionTypes, type INode, type INodeTypeDescription } from 'n8n-workflow';
import nodePopularity from 'virtual:node-popularity-data';

import AgentToolItem from './AgentToolItem.vue';

import type { IWorkflowDb } from '@/Interface';
import type { AgentJsonToolRef } from '../types';
import { AGENT_TOOL_CONFIG_MODAL_KEY } from '../constants';
import {
	isToolMissingCredentials,
	nodeTypeToNewToolRef,
	toolRefToNode,
	workflowToNewToolRef,
} from '../composables/useAgentToolRefAdapter';
import { useAgentToolTelemetry } from '../composables/useAgentToolTelemetry';

const props = defineProps<{
	modalName: string;
	data: {
		tools: AgentJsonToolRef[];
		/** Optional — when present, the Available list will include workflows scoped to this project. */
		projectId?: string;
		/** Optional — tagged onto telemetry events for correlation with agent analytics. */
		agentId?: string;
		onConfirm: (tools: AgentJsonToolRef[]) => void;
	};
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const message = useMessage();
const workflowsListStore = useWorkflowsListStore();
const toolTelemetry = useAgentToolTelemetry(props.data.agentId);

const nodePopularityMap = new Map(nodePopularity.map((node) => [node.id, node.popularity]));

// Local working copy — all edits go here; saved to config via onConfirm.
const workingTools = ref<AgentJsonToolRef[]>([...props.data.tools]);
watch(
	() => props.data.tools,
	(tools) => {
		workingTools.value = [...tools];
	},
);

const searchQuery = ref('');
const debouncedSearchQuery = ref('');
const setDebouncedSearch = useDebounceFn((value: string) => {
	debouncedSearchQuery.value = value;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
watch(searchQuery, (value) => {
	void setDebouncedSearch(value);
});

// --- Helpers ----------------------------------------------------------------

function hasInputs(nodeType: INodeTypeDescription): boolean {
	const { inputs } = nodeType;
	if (Array.isArray(inputs)) return inputs.length > 0;
	// Expression-based inputs are considered non-empty.
	return true;
}

/**
 * Node types eligible to appear in "Available tools": anything the node types
 * store exposes as outputting an AI Tool connection, minus nodes that also
 * take inputs (subagents — not simple tools).
 */
const availableToolTypes = computed<INodeTypeDescription[]>(() => {
	const names =
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames[NodeConnectionTypes.AiTool] ?? [];
	return names
		.map((name) => nodeTypesStore.getNodeType(name))
		.filter((nt): nt is INodeTypeDescription => nt !== null && !hasInputs(nt))
		.sort((a, b) => {
			const popA = nodePopularityMap.get(a.name) ?? 0;
			const popB = nodePopularityMap.get(b.name) ?? 0;
			return popB - popA;
		});
});

/** Node types already connected as tools on this agent (rendered in the top section). */
const connectedToolNodeTypes = computed(
	() =>
		new Set(
			workingTools.value
				.filter((t) => t.type === 'node' && t.node?.nodeType)
				.map((t) => t.node!.nodeType),
		),
);

/** Workflow names already connected — used to hide them from the Available list. */
const connectedWorkflowNames = computed(
	() =>
		new Set(
			workingTools.value
				.filter((t) => t.type === 'workflow' && t.workflow)
				.map((t) => t.workflow as string),
		),
);

// --- Workflow catalog -------------------------------------------------------

onMounted(() => {
	// Fetch on open so the Available list populates with project-scoped workflows.
	// Failures are non-fatal: the Available list just stays workflow-free.
	void workflowsListStore.fetchAllWorkflows(props.data.projectId).catch(() => {});
});

/**
 * Workflows eligible to appear in "Workflows (N)": all non-archived workflows
 * the user has access to, minus any already connected. Trigger / node
 * compatibility is enforced by the backend on save — see
 * `workflow-tool-factory.ts:validateCompatibility`.
 */
const availableWorkflows = computed<IWorkflowDb[]>(() =>
	workflowsListStore.allWorkflows.filter(
		(wf) => !wf.isArchived && !connectedWorkflowNames.value.has(wf.name),
	),
);

/** Configured tools annotated with their node-type description (for the icon + fallback name). */
interface ConfiguredToolView {
	ref: AgentJsonToolRef;
	node: INode;
	nodeType: INodeTypeDescription;
	missingCredentials: boolean;
}

const configuredTools = computed<ConfiguredToolView[]>(() => {
	const out: ConfiguredToolView[] = [];
	for (const ref of workingTools.value) {
		if (ref.type !== 'node') continue;
		const node = toolRefToNode(ref);
		if (!node) continue;
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType) continue;
		out.push({
			ref,
			node,
			nodeType,
			missingCredentials: isToolMissingCredentials(ref, nodeType),
		});
	}
	return out;
});

/** Connected workflow tools — mirrors `configuredTools` for the Connected section. */
interface ConfiguredWorkflowView {
	ref: AgentJsonToolRef;
	name: string;
	description?: string;
}

const configuredWorkflows = computed<ConfiguredWorkflowView[]>(() =>
	workingTools.value
		.filter((t) => t.type === 'workflow')
		.map((ref) => ({
			ref,
			name: ref.name ?? (ref.workflow as string),
			description: ref.description,
		})),
);

// --- Search filtering -------------------------------------------------------

const filteredConfiguredTools = computed(() => {
	if (!debouncedSearchQuery.value) return configuredTools.value;
	const query = debouncedSearchQuery.value.toLowerCase();
	return configuredTools.value.filter(
		(t) =>
			t.node.name.toLowerCase().includes(query) ||
			t.nodeType.displayName.toLowerCase().includes(query),
	);
});

const filteredConfiguredWorkflows = computed(() => {
	if (!debouncedSearchQuery.value) return configuredWorkflows.value;
	const query = debouncedSearchQuery.value.toLowerCase();
	return configuredWorkflows.value.filter(
		(w) =>
			w.name.toLowerCase().includes(query) || (w.description ?? '').toLowerCase().includes(query),
	);
});

const filteredAvailableTools = computed(() => {
	// Hide node types the user has already connected.
	const filtered = availableToolTypes.value.filter(
		(nt) => !connectedToolNodeTypes.value.has(nt.name),
	);
	if (!debouncedSearchQuery.value) return filtered;
	const query = debouncedSearchQuery.value.toLowerCase();
	return filtered.filter(
		(nt) =>
			nt.displayName.toLowerCase().includes(query) || nt.description?.toLowerCase().includes(query),
	);
});

const filteredAvailableWorkflows = computed(() => {
	if (!debouncedSearchQuery.value) return availableWorkflows.value;
	const query = debouncedSearchQuery.value.toLowerCase();
	return availableWorkflows.value.filter(
		(wf) =>
			wf.name.toLowerCase().includes(query) || (wf.description ?? '').toLowerCase().includes(query),
	);
});

// --- Actions ---------------------------------------------------------------

function openConfigForNewRef(newRef: AgentJsonToolRef) {
	// Connect → open the config panel first. The ref only enters workingTools
	// once the user hits Save, so a cancelled config leaves the list untouched.
	const existingToolNames = workingTools.value.filter((t) => t.name).map((t) => t.name as string);

	uiStore.openModalWithData({
		name: AGENT_TOOL_CONFIG_MODAL_KEY,
		data: {
			toolRef: newRef,
			existingToolNames,
			onConfirm: (savedRef: AgentJsonToolRef) => {
				workingTools.value = [...workingTools.value, savedRef];
				toolTelemetry.trackAdded(savedRef);
				commit();
			},
		},
	});
}

function handleAddTool(nodeType: INodeTypeDescription) {
	toolTelemetry.trackAddStarted('node');
	openConfigForNewRef(nodeTypeToNewToolRef(nodeType));
}

function handleAddWorkflow(workflow: IWorkflowDb) {
	toolTelemetry.trackAddStarted('workflow');
	openConfigForNewRef(workflowToNewToolRef(workflow));
}

async function handleRemoveTool(toolRef: AgentJsonToolRef) {
	const confirmed = await message.confirm(
		i18n.baseText('agents.tools.confirmRemove.message'),
		i18n.baseText('agents.tools.confirmRemove.title'),
		{
			confirmButtonText: i18n.baseText('agents.tools.remove'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;

	workingTools.value = workingTools.value.filter((t) => t !== toolRef);
	toolTelemetry.trackRemoved(toolRef);
	commit();
}

function handleConfigureTool(toolRef: AgentJsonToolRef) {
	// Node name collision check feeds the shared form's uniqueness logic.
	const existingToolNames = workingTools.value
		.filter((t) => t !== toolRef && t.name)
		.map((t) => t.name as string);

	uiStore.openModalWithData({
		name: AGENT_TOOL_CONFIG_MODAL_KEY,
		data: {
			toolRef,
			existingToolNames,
			onConfirm: (updatedRef: AgentJsonToolRef) => {
				workingTools.value = workingTools.value.map((t) => (t === toolRef ? updatedRef : t));
				toolTelemetry.trackEdited(updatedRef);
				commit();
			},
		},
	});
}

function commit() {
	props.data.onConfirm(workingTools.value);
}
</script>

<template>
	<Modal
		:name="modalName"
		width="880px"
		:custom-class="$style.modal"
		data-test-id="agent-tools-modal"
	>
		<template #header>
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText('agents.tools.title') }}
			</N8nHeading>
		</template>

		<template #content>
			<N8nInput
				v-model="searchQuery"
				:placeholder="i18n.baseText('agents.tools.search.placeholder')"
				clearable
				data-test-id="agent-tools-search"
				:class="$style.searchInput"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>

			<div :class="$style.listWrapper" data-test-id="agent-tools-list">
				<div
					v-if="filteredConfiguredTools.length + filteredConfiguredWorkflows.length > 0"
					:class="$style.section"
				>
					<div :class="$style.toolsList" data-test-id="agent-tools-connected-list">
						<AgentToolItem
							v-for="tool in filteredConfiguredTools"
							:key="tool.node.id"
							:node-type="tool.nodeType"
							:configured-node="tool.node"
							:missing-credentials="tool.missingCredentials"
							mode="configured"
							@configure="handleConfigureTool(tool.ref)"
							@remove="handleRemoveTool(tool.ref)"
						/>
						<div
							v-for="wf in filteredConfiguredWorkflows"
							:key="`wf-${wf.name}`"
							:class="$style.workflowRow"
							data-test-id="agent-tools-connected-workflow-row"
						>
							<div :class="$style.workflowLabel">
								<div :class="$style.workflowIconWrapper">
									<N8nIcon icon="workflow" :size="20" :class="$style.workflowIcon" />
								</div>
								<div :class="$style.workflowTextWrapper">
									<N8nText size="small" color="text-dark" :class="$style.workflowName">
										{{ wf.name }}
									</N8nText>
									<N8nText
										v-if="wf.description"
										size="small"
										color="text-light"
										:class="$style.workflowDescription"
									>
										{{ wf.description }}
									</N8nText>
								</div>
							</div>
							<div :class="$style.workflowActions">
								<button
									type="button"
									:class="$style.workflowActionBtn"
									:title="i18n.baseText('agents.tools.configure')"
									data-test-id="agent-tools-connected-workflow-configure"
									@click="handleConfigureTool(wf.ref)"
								>
									<N8nIcon icon="settings" :size="16" />
								</button>
								<button
									type="button"
									:class="$style.workflowActionBtn"
									:title="i18n.baseText('agents.tools.remove')"
									data-test-id="agent-tools-connected-workflow-remove"
									@click="handleRemoveTool(wf.ref)"
								>
									<N8nIcon icon="trash-2" :size="16" />
								</button>
							</div>
						</div>
					</div>
				</div>

				<div v-if="filteredAvailableTools.length > 0" :class="$style.section">
					<N8nHeading size="small" color="text-light" tag="h3">
						{{
							i18n.baseText('agents.tools.availableTools', {
								interpolate: { count: filteredAvailableTools.length },
							})
						}}
					</N8nHeading>
					<div :class="$style.toolsList" data-test-id="agent-tools-available-list">
						<AgentToolItem
							v-for="nodeType in filteredAvailableTools"
							:key="nodeType.name"
							:node-type="nodeType"
							mode="available"
							@add="handleAddTool(nodeType)"
						/>
					</div>
				</div>

				<div v-if="filteredAvailableWorkflows.length > 0" :class="$style.section">
					<N8nHeading size="small" color="text-light" tag="h3">
						{{
							i18n.baseText('agents.tools.availableWorkflows', {
								interpolate: { count: filteredAvailableWorkflows.length },
							})
						}}
					</N8nHeading>
					<div :class="$style.toolsList" data-test-id="agent-tools-available-workflows-list">
						<div
							v-for="workflow in filteredAvailableWorkflows"
							:key="workflow.id"
							:class="$style.workflowRow"
							data-test-id="agent-tools-available-workflow-row"
						>
							<div :class="$style.workflowLabel">
								<div :class="$style.workflowIconWrapper">
									<N8nIcon icon="workflow" :size="20" :class="$style.workflowIcon" />
								</div>
								<div :class="$style.workflowTextWrapper">
									<N8nText size="small" color="text-dark" :class="$style.workflowName">
										{{ workflow.name }}
									</N8nText>
									<N8nText
										v-if="workflow.description"
										size="small"
										color="text-light"
										:class="$style.workflowDescription"
									>
										{{ workflow.description }}
									</N8nText>
								</div>
							</div>
							<N8nButton variant="subtle" size="small" @click="handleAddWorkflow(workflow)">
								{{ i18n.baseText('agents.tools.connect') }}
							</N8nButton>
						</div>
					</div>
				</div>

				<div
					v-if="
						filteredConfiguredTools.length === 0 &&
						filteredConfiguredWorkflows.length === 0 &&
						filteredAvailableTools.length === 0 &&
						filteredAvailableWorkflows.length === 0
					"
					:class="$style.emptyState"
				>
					<N8nText color="text-light">
						{{ i18n.baseText('agents.tools.noResults') }}
					</N8nText>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.modal {
	:global(.ndv-connection-hint-notice) {
		display: none;
	}
}

.searchInput {
	padding: var(--spacing--sm) 0;
	width: 100%;
}

.listWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-height: 60vh;
	overflow-y: auto;
	margin-right: calc(-1 * var(--spacing--lg));
	padding-right: var(--spacing--lg);
	padding-top: var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.toolsList {
	display: flex;
	flex-direction: column;
}

.workflowRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
}

.workflowLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	min-width: 0;
	flex: 1;
}

.workflowIconWrapper {
	flex-shrink: 0;
	width: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.workflowIcon {
	color: var(--color--primary);
}

.workflowTextWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.workflowName {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.workflowDescription {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.workflowActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.workflowActionBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text--tint-1);
	border-radius: var(--radius);

	&:hover {
		background-color: var(--color--foreground--tint-1);
		color: var(--color--text);
	}
}

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
}
</style>
