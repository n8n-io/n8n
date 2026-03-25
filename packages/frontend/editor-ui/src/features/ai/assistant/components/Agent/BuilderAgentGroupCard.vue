<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import TriggerExecuteButton from '@/features/setupPanel/components/TriggerExecuteButton.vue';
import SetupCardSection from '@/features/setupPanel/components/cards/SetupCardSection.vue';
import SetupCardBody from '@/features/setupPanel/components/cards/SetupCardBody.vue';

import type { AgentGroupItem, NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import { isCardComplete } from '@/features/setupPanel/setupPanel.types';
import type { INodeUi } from '@/Interface';
import type { INodeProperties } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useTriggerExecution } from '@/features/setupPanel/composables/useTriggerExecution';

const props = defineProps<{
	agentGroup: AgentGroupItem;
	stepIndex: number;
	totalCards: number;
	firstTriggerName: string | null;
}>();

const emit = defineEmits<{
	goToNext: [];
	goToPrev: [];
	stepExecuted: [];
	credentialSelected: [payload: { credentialType: string; credentialId: string; nodeName: string }];
	credentialDeselected: [payload: { credentialType: string; nodeName: string }];
	sectionHighlight: [nodeIds: string[] | null];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();

const agentNodeType = computed(() =>
	nodeTypesStore.getNodeType(
		props.agentGroup.agentNode.type,
		props.agentGroup.agentNode.typeVersion,
	),
);

// Per-section sticky parameter tracking (same pattern as AgentGroupSetupCard)
const stickyParametersMap = reactive<Record<string, INodeProperties[]>>({});
function getStickyParameters(nodeId: string): INodeProperties[] {
	if (!stickyParametersMap[nodeId]) {
		stickyParametersMap[nodeId] = [];
	}
	return stickyParametersMap[nodeId];
}

// Execute button always targets the agent node
const executableNode = computed<INodeUi | null>(() => props.agentGroup.agentNode);

const {
	isExecuting,
	isButtonDisabled,
	label: executeLabel,
	buttonIcon: executeButtonIcon,
	tooltipItems: executeTooltipItems,
	execute,
	isInListeningState,
} = useTriggerExecution(executableNode);

const isActive = computed(() => isExecuting.value || isInListeningState.value);

const subnodeSections = computed<NodeSetupState[]>(() => props.agentGroup.subnodeCards);

/** All sections including agent state — used for completion tracking */
const allSections = computed<NodeSetupState[]>(() => {
	const sections: NodeSetupState[] = [];
	if (props.agentGroup.agentState) sections.push(props.agentGroup.agentState);
	sections.push(...subnodeSections.value);
	return sections;
});

const isGroupComplete = computed(() => isCardComplete({ agentGroup: props.agentGroup }));

// Section expand/collapse state
const expandedSections = reactive<Record<string, boolean>>({});

function initExpandState() {
	for (const section of allSections.value) {
		const key = section.node.id;
		if (!(key in expandedSections)) {
			expandedSections[key] = false;
		}
	}
	// Expand first incomplete
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

const isAnyCredentialTesting = computed(() =>
	allSections.value.some((s) => {
		const id = s.selectedCredentialId;
		return !!id && credentialsStore.isCredentialTestPending(id);
	}),
);

const isLastCard = computed(() => props.stepIndex === props.totalCards - 1);

const showArrows = computed(() => props.totalCards > 1);
const isPrevDisabled = computed(() => props.stepIndex === 0);
const isNextDisabled = computed(() => isLastCard.value);

// Notify parent on execution finish
watch(isActive, (active, wasActive) => {
	if (wasActive && !active) {
		const runData = workflowsStore.getWorkflowResultDataByNodeName(props.agentGroup.agentNode.name);
		const lastRun = runData?.[runData.length - 1];
		if (!lastRun?.error) {
			emit('stepExecuted');
		}
	}
});

const hoveredSection = ref<NodeSetupState | null>(null);

function onSectionMouseEnter(section: NodeSetupState) {
	hoveredSection.value = section;
}

function onSectionMouseLeave() {
	hoveredSection.value = null;
}

watch(hoveredSection, (section) => {
	if (section) {
		const ids = (section.allNodesUsingCredential ?? [section.node]).map((n) => n.id);
		emit('sectionHighlight', ids);
	} else {
		emit('sectionHighlight', null);
	}
});

function getSectionNodeType(section: NodeSetupState) {
	return nodeTypesStore.getNodeType(section.node.type, section.node.typeVersion);
}
</script>

<template>
	<div
		data-test-id="builder-agent-group-card"
		:class="[$style.card, { [$style.completed]: isGroupComplete }]"
	>
		<!-- Agent header -->
		<header :class="$style.header">
			<NodeIcon :node-type="agentNodeType" :size="16" />
			<N8nText :class="$style.title" size="medium" color="text-dark" bold>
				{{ agentGroup.agentNode.name }}
			</N8nText>
			<N8nText
				v-if="isGroupComplete"
				data-test-id="builder-agent-group-card-check"
				:class="$style.completeLabel"
				size="medium"
				color="success"
			>
				<N8nIcon icon="check" size="large" />
				{{ i18n.baseText('generic.complete') }}
			</N8nText>
		</header>

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
					:is-wizard="true"
					@credential-selected="(p) => emit('credentialSelected', p)"
					@credential-deselected="(p) => emit('credentialDeselected', p)"
					@parameters-discovered="
						(params) => getStickyParameters(agentGroup.agentState!.node.id).push(...params)
					"
				/>
			</SetupCardSection>
		</div>

		<!-- Subnode sections -->
		<div :class="$style.sections">
			<div
				v-for="section in subnodeSections"
				:key="section.node.id"
				:class="$style.section"
				data-test-id="builder-agent-group-section"
				@mouseenter="onSectionMouseEnter(section)"
				@mouseleave="onSectionMouseLeave"
			>
				<div
					:class="$style.sectionHeader"
					data-test-id="builder-agent-group-section-header"
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
							:is-wizard="true"
							@credential-selected="(p) => emit('credentialSelected', p)"
							@credential-deselected="(p) => emit('credentialDeselected', p)"
							@parameters-discovered="
								(params) => getStickyParameters(section.node.id).push(...params)
							"
						/>
					</SetupCardSection>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<footer :class="$style.footer">
			<div :class="$style.footerNav">
				<N8nButton
					v-if="showArrows"
					variant="ghost"
					size="xsmall"
					icon-only
					:disabled="isPrevDisabled"
					data-test-id="builder-agent-group-card-prev"
					aria-label="Previous step"
					@click="emit('goToPrev')"
				>
					<N8nIcon icon="chevron-left" size="xsmall" />
				</N8nButton>
				<N8nText size="small" color="text-light"> {{ stepIndex + 1 }} of {{ totalCards }} </N8nText>
				<N8nButton
					v-if="showArrows"
					variant="ghost"
					size="xsmall"
					icon-only
					:disabled="isNextDisabled"
					data-test-id="builder-agent-group-card-next"
					aria-label="Next step"
					@click="emit('goToNext')"
				>
					<N8nIcon icon="chevron-right" size="xsmall" />
				</N8nButton>
			</div>

			<div :class="$style.footerActions">
				<TriggerExecuteButton
					:label="executeLabel"
					:icon="executeButtonIcon"
					:disabled="isButtonDisabled || isAnyCredentialTesting"
					:loading="isExecuting"
					:tooltip-items="executeTooltipItems"
					@click="execute"
				/>
			</div>
		</footer>
	</div>
</template>

<style module lang="scss">
.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	padding: 0;
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius);

	&.completed {
		border-color: var(--color--success);
	}
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
}

.agentBody {
	padding: 0 var(--spacing--sm);
}

.title {
	flex: 1;
}

.completeLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.sections {
	display: flex;
	flex-direction: column;
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

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	border-top: var(--border);
	padding: var(--spacing--xs) var(--spacing--sm);
}

.footerNav {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--4xs);
}

.footerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
