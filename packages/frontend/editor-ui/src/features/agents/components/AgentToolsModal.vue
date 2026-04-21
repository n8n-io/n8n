<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { DEBOUNCE_TIME, getDebounceTime, MODAL_CONFIRM } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import { N8nHeading, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDebounceFn } from '@vueuse/core';
import { NodeConnectionTypes, type INode, type INodeTypeDescription } from 'n8n-workflow';
import nodePopularity from 'virtual:node-popularity-data';

import AgentToolItem from './AgentToolItem.vue';

import type { AgentJsonToolRef } from '../types';
import { AGENT_TOOL_CONFIG_MODAL_KEY } from '../constants';
import {
	isToolMissingCredentials,
	nodeTypeToNewToolRef,
	toolRefToNode,
} from '../composables/useAgentToolRefAdapter';

const props = defineProps<{
	modalName: string;
	data: {
		tools: AgentJsonToolRef[];
		onConfirm: (tools: AgentJsonToolRef[]) => void;
	};
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const message = useMessage();

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

// --- Actions ---------------------------------------------------------------

function handleAddTool(nodeType: INodeTypeDescription) {
	const newRef = nodeTypeToNewToolRef(nodeType);
	workingTools.value = [...workingTools.value, newRef];
	commit();
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
				<div v-if="filteredConfiguredTools.length > 0" :class="$style.section">
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

				<div
					v-if="filteredConfiguredTools.length === 0 && filteredAvailableTools.length === 0"
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

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
}
</style>
