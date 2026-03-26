<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { INodeProperties } from 'n8n-workflow';

import NodeIcon from '@/app/components/NodeIcon.vue';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';
import SetupCardSection from '@/features/setupPanel/components/cards/SetupCardSection.vue';
import SetupCardBody from '@/features/setupPanel/components/cards/SetupCardBody.vue';

import type { AgentGroupItem, NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import { isCardComplete } from '@/features/setupPanel/setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';

const props = defineProps<{
	agentGroup: AgentGroupItem;
	firstTriggerName?: string | null;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const emit = defineEmits<{
	credentialSelected: [payload: { credentialType: string; credentialId: string; nodeName: string }];
	credentialDeselected: [payload: { credentialType: string; nodeName: string }];
}>();

const nodeTypesStore = useNodeTypesStore();
const nodeHelpers = useNodeHelpers();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const setupPanelStore = useSetupPanelStore();

const setupCard = ref<InstanceType<typeof SetupCard> | null>(null);

const agentNodeType = computed(() =>
	nodeTypesStore.getNodeType(
		props.agentGroup.agentNode.type,
		props.agentGroup.agentNode.typeVersion,
	),
);

// Executable node for the agent card
const executableNode = computed(() => {
	const node = props.agentGroup.agentNode;
	if (!nodeHelpers.isNodeExecutable(node, true, [])) return null;
	return node;
});

const subnodeSections = computed<NodeSetupState[]>(() => props.agentGroup.subnodeCards);

/** All sections including agent state — used for completion tracking */
const allSections = computed<NodeSetupState[]>(() => {
	const sections: NodeSetupState[] = [];
	if (props.agentGroup.agentState) sections.push(props.agentGroup.agentState);
	sections.push(...subnodeSections.value);
	return sections;
});

const groupComplete = computed(() => isCardComplete({ agentGroup: props.agentGroup }));

// Per-section sticky parameter tracking
const stickyParametersMap = reactive<Record<string, INodeProperties[]>>({});
function getStickyParameters(nodeId: string): INodeProperties[] {
	if (!stickyParametersMap[nodeId]) {
		stickyParametersMap[nodeId] = [];
	}
	return stickyParametersMap[nodeId];
}

// Section expand/collapse state
const expandedSections = reactive<Record<string, boolean>>({});

function initExpandState() {
	for (const section of allSections.value) {
		if (!(section.node.id in expandedSections)) {
			expandedSections[section.node.id] = false;
		}
	}
	const firstIncomplete = allSections.value.find((s) => !s.isComplete);
	if (firstIncomplete) {
		expandedSections[firstIncomplete.node.id] = true;
	}
}
initExpandState();

function toggleSection(nodeId: string) {
	expandedSections[nodeId] = !expandedSections[nodeId];
}

const sectionHasParameters = (section: NodeSetupState) =>
	Object.keys(section.parameterIssues).length > 0 ||
	(section.additionalParameterNames?.length ?? 0) > 0;

// Auto-expand next incomplete when a credential-only section completes.
// Sections with parameters stay open so the user isn't interrupted mid-input.
const prevSectionComplete = new Map<string, boolean>();
watch(
	allSections,
	(sections) => {
		for (const section of sections) {
			const wasComplete = prevSectionComplete.get(section.node.id) ?? false;
			if (section.isComplete && !wasComplete && !sectionHasParameters(section)) {
				expandedSections[section.node.id] = false;
				const nextIncomplete = sections.find((s) => !s.isComplete && s.node.id !== section.node.id);
				if (nextIncomplete) {
					expandedSections[nextIncomplete.node.id] = true;
				}
			}
		}
		prevSectionComplete.clear();
		for (const section of sections) {
			prevSectionComplete.set(section.node.id, section.isComplete);
		}
	},
	{ deep: true },
);

// Per-section autoAppliedAcknowledged tracking
const autoAppliedAcknowledged = reactive<Record<string, boolean>>({});
for (const section of allSections.value) {
	autoAppliedAcknowledged[section.node.id] = !section.isAutoApplied;
}

watch(
	allSections,
	(sections) => {
		for (const section of sections) {
			if (!(section.node.id in autoAppliedAcknowledged)) {
				autoAppliedAcknowledged[section.node.id] = !section.isAutoApplied;
			}
			if (!section.isAutoApplied) {
				autoAppliedAcknowledged[section.node.id] = true;
			}
		}
	},
	{ deep: true },
);

const cardHighlightNodeIds = computed(() => {
	const ids = [props.agentGroup.agentNode.id];
	for (const section of allSections.value) {
		if (!ids.includes(section.node.id)) ids.push(section.node.id);
	}
	return ids;
});

const hoveredSection = ref<NodeSetupState | null>(null);

const highlightNodeIds = computed(() => {
	if (hoveredSection.value) {
		return (hoveredSection.value.allNodesUsingCredential ?? [hoveredSection.value.node]).map(
			(n) => n.id,
		);
	}
	return cardHighlightNodeIds.value;
});

// Sync per-section highlight to the store while the card is expanded
watch(highlightNodeIds, (ids) => {
	if (expanded.value) {
		setupPanelStore.setHighlightedNodes(ids);
	}
});

// When outer card collapses, acknowledge auto-applied sections and reset section highlight
watch(expanded, (value, oldValue) => {
	if (oldValue && !value) {
		hoveredSection.value = null;
		for (const section of allSections.value) {
			if (section.isAutoApplied) {
				autoAppliedAcknowledged[section.node.id] = true;
			}
		}
	}
});

const hasParameters = computed(() =>
	allSections.value.some(
		(s) =>
			Object.keys(s.parameterIssues).length > 0 || (s.additionalParameterNames?.length ?? 0) > 0,
	),
);

const telemetryPayload = computed(() => ({
	type: ['agent-group'],
	template_id: workflowDocumentStore?.value?.meta?.templateId,
	workflow_id: workflowsStore.workflow.id,
	node_types: allSections.value.map((s) => s.node.type),
	has_parameters: hasParameters.value,
}));

const showFooter = computed(() => executableNode.value !== null);

const onBodyInteracted = () => {
	setupCard.value?.markInteracted();
};

function onSectionMouseEnter(section: NodeSetupState) {
	hoveredSection.value = section;
}

function onSectionMouseLeave() {
	hoveredSection.value = null;
}

function getSectionNodeType(section: NodeSetupState) {
	return nodeTypesStore.getNodeType(section.node.type, section.node.typeVersion);
}
</script>

<template>
	<SetupCard
		ref="setupCard"
		v-model:expanded="expanded"
		:is-complete="groupComplete"
		:title="agentGroup.agentNode.name"
		:show-footer="showFooter"
		:executable-node="executableNode"
		:telemetry-payload="telemetryPayload"
		:highlight-node-ids="highlightNodeIds"
		card-test-id="agent-group-setup-card"
	>
		<template #icon>
			<NodeIcon :node-type="agentNodeType" :size="16" />
		</template>

		<!-- Agent's own credentials/parameters -->
		<div
			v-if="agentGroup.agentState"
			:class="$style.agentBody"
			@mouseenter="onSectionMouseEnter(agentGroup.agentState)"
			@mouseleave="onSectionMouseLeave"
		>
			<SetupCardSection :state="agentGroup.agentState">
				<SetupCardBody
					:state="agentGroup.agentState"
					:sticky-parameters="getStickyParameters(agentGroup.agentState.node.id)"
					@credential-selected="
						(p) => {
							onBodyInteracted();
							emit('credentialSelected', p);
						}
					"
					@credential-deselected="
						(p) => {
							onBodyInteracted();
							emit('credentialDeselected', p);
						}
					"
					@interacted="onBodyInteracted"
					@parameters-discovered="
						(params) => getStickyParameters(agentGroup.agentState!.node.id).push(...params)
					"
				/>
			</SetupCardSection>
		</div>

		<!-- Subnode sections -->
		<div :class="$style.sections" data-test-id="agent-group-sections">
			<div
				v-for="section in subnodeSections"
				:key="section.node.id"
				:class="$style.section"
				data-test-id="agent-group-section"
				@mouseenter="onSectionMouseEnter(section)"
				@mouseleave="onSectionMouseLeave"
			>
				<div
					:class="$style.sectionHeader"
					data-test-id="agent-group-section-header"
					@click="toggleSection(section.node.id)"
				>
					<N8nIcon
						v-if="section.isComplete"
						icon="check"
						size="small"
						:class="$style.sectionCheck"
					/>
					<NodeIcon v-else :node-type="getSectionNodeType(section)" :size="14" />
					<N8nText :class="$style.sectionTitle" size="medium" color="text-dark">
						{{ section.node.name }}
					</N8nText>
					<N8nIcon
						:class="$style.sectionChevron"
						:icon="expandedSections[section.node.id] ? 'chevrons-down-up' : 'chevrons-up-down'"
						size="large"
						color="text-light"
					/>
				</div>
				<div v-if="expandedSections[section.node.id]" :class="$style.sectionContent">
					<SetupCardSection :state="section">
						<SetupCardBody
							:state="section"
							:sticky-parameters="getStickyParameters(section.node.id)"
							@credential-selected="
								(p) => {
									onBodyInteracted();
									emit('credentialSelected', p);
								}
							"
							@credential-deselected="
								(p) => {
									onBodyInteracted();
									emit('credentialDeselected', p);
								}
							"
							@interacted="onBodyInteracted"
							@parameters-discovered="
								(params) => getStickyParameters(section.node.id).push(...params)
							"
						/>
					</SetupCardSection>
				</div>
			</div>
		</div>
	</SetupCard>
</template>

<style module lang="scss">
.agentBody {
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}

.sections {
	display: flex;
	flex-direction: column;
	border-bottom: var(--border);
}

.section {
	border-top: var(--border);
	padding: var(--spacing--sm);
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	user-select: none;

	.sectionChevron {
		display: none;
	}

	&:hover .sectionChevron {
		display: block;
	}
}

.sectionTitle {
	flex: 1;
	font-weight: var(--font-weight--medium);
}

.sectionCheck {
	color: var(--color--success);
}

.sectionContent {
	padding: var(--spacing--xs);
}
</style>
