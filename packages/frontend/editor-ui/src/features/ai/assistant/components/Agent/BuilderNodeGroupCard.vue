<script setup lang="ts">
import { computed, toRef, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import TriggerExecuteButton from '@/features/setupPanel/components/TriggerExecuteButton.vue';
import SetupCardSection from '@/features/setupPanel/components/cards/SetupCardSection.vue';
import SetupCardBody from '@/features/setupPanel/components/cards/SetupCardBody.vue';

import type { NodeGroupItem } from '@/features/setupPanel/setupPanel.types';
import type {
	CredentialSelectedPayload,
	CredentialDeselectedPayload,
} from '@/features/setupPanel/setupPanel.types';
import { isCardComplete } from '@/features/setupPanel/setupPanel.utils';
import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useTriggerExecution } from '@/features/setupPanel/composables/useTriggerExecution';
import { useNodeGroupSections } from '@/features/setupPanel/composables/useNodeGroupSections';

const props = defineProps<{
	nodeGroup: NodeGroupItem;
	stepIndex: number;
	totalCards: number;
}>();

const emit = defineEmits<{
	goToNext: [];
	goToPrev: [];
	continueCurrent: [];
	stepExecuted: [];
	credentialSelected: [payload: CredentialSelectedPayload];
	credentialDeselected: [payload: CredentialDeselectedPayload];
	sectionHighlight: [nodeIds: string[] | null];
}>();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();
const nodeHelpers = useNodeHelpers();

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

// Execute button always targets the parent node, but only if it's actually executable
const executableNode = computed<INodeUi | null>(() => {
	const parent = props.nodeGroup.parentNode;
	if (!nodeHelpers.isNodeExecutable(parent, true, [])) return null;
	return parent;
});

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

const isLastCard = computed(() => props.stepIndex === props.totalCards - 1);
const showArrows = computed(() => props.totalCards > 1);
const isPrevDisabled = computed(() => props.stepIndex === 0);
const isNextDisabled = computed(() => isLastCard.value);

const isExecutable = computed(() => executableNode.value !== null);
const showContinue = computed(
	() => !isExecutable.value && props.totalCards > 1 && !isLastCard.value,
);

const isGroupComplete = computed(() => isCardComplete({ nodeGroup: props.nodeGroup }));

const isAnyCredentialTesting = computed(() =>
	allSections.value.some((s) => {
		const id = s.selectedCredentialId;
		return !!id && credentialsStore.isCredentialTestPending(id);
	}),
);

// Notify parent on execution finish
watch(isActive, (active, wasActive) => {
	if (wasActive && !active) {
		const runData = workflowsStore.getWorkflowResultDataByNodeName(props.nodeGroup.parentNode.name);
		const lastRun = runData?.[runData.length - 1];
		if (!lastRun?.error) {
			emit('stepExecuted');
		}
	}
});

watch(hoveredSection, (section) => {
	if (section) {
		const ids = (section.allNodesUsingCredential ?? [section.node]).map((n) => n.id);
		emit('sectionHighlight', ids);
	} else {
		emit('sectionHighlight', null);
	}
});
</script>

<template>
	<div
		data-test-id="builder-node-group-card"
		:class="[$style.card, { [$style.completed]: isGroupComplete }]"
	>
		<!-- Parent header -->
		<header
			:class="[$style.header, { [$style.headerClickable]: !!nodeGroup.parentState }]"
			@click="nodeGroup.parentState && toggleSection(nodeGroup.parentState.node.id)"
		>
			<NodeIcon :node-type="parentNodeType" :size="16" />
			<N8nText :class="$style.title" size="medium" color="text-dark" bold>
				{{ nodeGroup.parentNode.name }}
			</N8nText>
			<N8nText
				v-if="isGroupComplete"
				data-test-id="builder-node-group-card-check"
				:class="$style.completeLabel"
				size="medium"
				color="success"
			>
				<N8nIcon icon="check" size="large" />
				{{ i18n.baseText('generic.complete') }}
			</N8nText>
			<N8nIcon
				v-if="nodeGroup.parentState"
				:class="$style.headerChevron"
				:icon="
					expandedSections[nodeGroup.parentState.node.id] ? 'chevrons-down-up' : 'chevrons-up-down'
				"
				size="large"
				color="text-light"
			/>
		</header>

		<!-- Parent node's own credentials/parameters -->
		<div
			v-if="nodeGroup.parentState && expandedSections[nodeGroup.parentState.node.id]"
			:class="$style.parentBody"
			@mouseenter="onSectionMouseEnter(nodeGroup.parentState)"
			@mouseleave="onSectionMouseLeave"
		>
			<SetupCardSection :state="nodeGroup.parentState">
				<SetupCardBody
					:state="nodeGroup.parentState"
					:sticky-parameters="getStickyParameters(nodeGroup.parentState.node.id)"
					:is-wizard="true"
					@credential-selected="(p) => emit('credentialSelected', p)"
					@credential-deselected="(p) => emit('credentialDeselected', p)"
					@parameters-discovered="
						(params) => addStickyParameters(nodeGroup.parentState!.node.id, params)
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
				data-test-id="builder-node-group-section"
				@mouseenter="onSectionMouseEnter(section)"
				@mouseleave="onSectionMouseLeave"
			>
				<div
					:class="$style.sectionHeader"
					data-test-id="builder-node-group-section-header"
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
							@parameters-discovered="(params) => addStickyParameters(section.node.id, params)"
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
					data-test-id="wizard-card-footer-prev"
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
					data-test-id="wizard-card-footer-next"
					aria-label="Next step"
					@click="emit('goToNext')"
				>
					<N8nIcon icon="chevron-right" size="xsmall" />
				</N8nButton>
			</div>

			<div :class="$style.footerActions">
				<N8nButton
					v-if="showContinue"
					data-test-id="builder-node-group-card-continue"
					type="primary"
					size="small"
					:class="$style.actionButton"
					:label="i18n.baseText('aiAssistant.builder.setupWizard.continue' as BaseTextKey)"
					@click="emit('continueCurrent')"
				/>

				<TriggerExecuteButton
					v-if="isExecutable"
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

	&.headerClickable {
		cursor: pointer;
		user-select: none;
	}

	.headerChevron {
		display: none;
	}

	&:hover .headerChevron {
		display: block;
	}
}

.parentBody {
	padding: 0 var(--spacing--sm) var(--spacing--sm);
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
	padding-top: var(--spacing--xs);
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

.actionButton {
	--button--font-size: var(--font-size--2xs);
}
</style>
