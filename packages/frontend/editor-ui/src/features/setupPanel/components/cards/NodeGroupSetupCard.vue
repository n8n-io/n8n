<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';
import SetupCardSection from '@/features/setupPanel/components/cards/SetupCardSection.vue';
import SetupCardBody from '@/features/setupPanel/components/cards/SetupCardBody.vue';

import type { NodeGroupItem } from '@/features/setupPanel/setupPanel.types';
import type {
	CredentialSelectedPayload,
	CredentialDeselectedPayload,
} from '@/features/setupPanel/setupPanel.types';
import { isCardComplete } from '@/features/setupPanel/setupPanel.utils';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import {
	useNodeGroupSections,
	sectionHasParameters,
} from '@/features/setupPanel/composables/useNodeGroupSections';

const props = defineProps<{
	nodeGroup: NodeGroupItem;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const emit = defineEmits<{
	credentialSelected: [payload: CredentialSelectedPayload];
	credentialDeselected: [payload: CredentialDeselectedPayload];
}>();

const nodeHelpers = useNodeHelpers();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const setupPanelStore = useSetupPanelStore();

const setupCard = ref<InstanceType<typeof SetupCard> | null>(null);

const {
	parentNodeType,
	subnodeSections,
	allSections,
	getStickyParameters,
	addStickyParameters,
	expandedSections,
	toggleSection,
	hoveredSection,
	onSectionMouseEnter,
	onSectionMouseLeave,
	getSectionNodeType,
} = useNodeGroupSections(toRef(props, 'nodeGroup'));

// Executable node for the parent card
const executableNode = computed(() => {
	const node = props.nodeGroup.parentNode;
	if (!nodeHelpers.isNodeExecutable(node, true, [])) return null;
	return node;
});

const groupComplete = computed(() => isCardComplete({ nodeGroup: props.nodeGroup }));

const cardHighlightNodeIds = computed(() => {
	const ids = new Set<string>([props.nodeGroup.parentNode.id]);
	for (const section of allSections.value) {
		ids.add(section.node.id);
	}
	return [...ids];
});

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

// When outer card collapses, reset section highlight
watch(expanded, (value, oldValue) => {
	if (oldValue && !value) {
		hoveredSection.value = null;
	}
});

const hasParameters = computed(() => allSections.value.some(sectionHasParameters));

const telemetryPayload = computed(() => ({
	type: ['node-group'],
	template_id: workflowDocumentStore?.value?.meta?.templateId,
	workflow_id: workflowsStore.workflow.id,
	node_types: allSections.value.map((s) => s.node.type),
	has_parameters: hasParameters.value,
}));

const showFooter = computed(() => executableNode.value !== null);

const onBodyInteracted = () => {
	setupCard.value?.markInteracted();
};
</script>

<template>
	<SetupCard
		ref="setupCard"
		v-model:expanded="expanded"
		:is-complete="groupComplete"
		:title="nodeGroup.parentNode.name"
		:show-footer="showFooter"
		:executable-node="executableNode"
		:telemetry-payload="telemetryPayload"
		:highlight-node-ids="highlightNodeIds"
		card-test-id="node-group-setup-card"
	>
		<template #icon>
			<NodeIcon :node-type="parentNodeType" :size="16" />
		</template>

		<!-- Parent node's own credentials/parameters -->
		<div
			v-if="nodeGroup.parentState"
			:class="$style.parentBody"
			@mouseenter="onSectionMouseEnter(nodeGroup.parentState)"
			@mouseleave="onSectionMouseLeave"
		>
			<SetupCardSection :state="nodeGroup.parentState">
				<SetupCardBody
					:state="nodeGroup.parentState"
					:sticky-parameters="getStickyParameters(nodeGroup.parentState.node.id)"
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
						(params) => addStickyParameters(nodeGroup.parentState!.node.id, params)
					"
				/>
			</SetupCardSection>
		</div>

		<!-- Subnode sections -->
		<div :class="$style.sections" data-test-id="node-group-sections">
			<div
				v-for="section in subnodeSections"
				:key="section.node.id"
				:class="$style.section"
				data-test-id="node-group-section"
				@mouseenter="onSectionMouseEnter(section)"
				@mouseleave="onSectionMouseLeave"
			>
				<div
					:class="$style.sectionHeader"
					data-test-id="node-group-section-header"
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
							@parameters-discovered="(params) => addStickyParameters(section.node.id, params)"
						/>
					</SetupCardSection>
				</div>
			</div>
		</div>
	</SetupCard>
</template>

<style module lang="scss">
.parentBody {
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
	padding-top: var(--spacing--xs);
}
</style>
