<script lang="ts" setup>
import { computed, toRef } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { WorkflowSetupGroup, WorkflowSetupSection } from '../workflowSetup.types';
import { getGroupSections } from '../workflowSetup.helpers';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';
import { useWorkflowSetupGroupSections } from '../composables/useWorkflowSetupGroupSections';
import WorkflowSetupSectionBody from './WorkflowSetupSectionBody.vue';

const props = defineProps<{
	group: WorkflowSetupGroup;
}>();

const i18n = useI18n();
const ctx = useWorkflowSetupContext();
const nodeTypesStore = useNodeTypesStore();

const groupRef = toRef(props, 'group');
const { expandedSections, toggleSection } = useWorkflowSetupGroupSections(groupRef);

const parentNodeType = computed(() =>
	nodeTypesStore.getNodeType(props.group.parentNode.type, props.group.parentNode.typeVersion),
);

const isGroupComplete = computed(() => getGroupSections(props.group).every(ctx.isSectionComplete));

function getSectionNodeType(section: WorkflowSetupSection) {
	return nodeTypesStore.getNodeType(section.node.type, section.node.typeVersion);
}
</script>

<template>
	<div :class="$style.card" data-test-id="instance-ai-workflow-setup-group-card">
		<header :class="$style.header">
			<NodeIcon :node-type="parentNodeType" :size="16" />
			<N8nText :class="$style.title" size="medium" color="text-dark" bold>
				{{ group.parentNode.name }}
			</N8nText>
			<N8nText
				v-if="isGroupComplete"
				data-test-id="instance-ai-workflow-setup-group-card-check"
				:class="$style.completeLabel"
				size="medium"
				color="success"
			>
				<N8nIcon icon="check" size="large" />
				{{ i18n.baseText('generic.complete') }}
			</N8nText>
		</header>

		<div :class="$style.sections">
			<div
				v-if="group.parentSection"
				:key="group.parentSection.id"
				:class="[$style.section, $style.parentSection]"
				data-test-id="instance-ai-workflow-setup-section"
			>
				<WorkflowSetupSectionBody :section="group.parentSection" />
			</div>

			<div
				v-for="section in group.subnodeSections"
				:key="section.id"
				:class="$style.section"
				data-test-id="instance-ai-workflow-setup-section"
			>
				<div
					:class="$style.sectionHeader"
					data-test-id="instance-ai-workflow-setup-section-header"
					@click="toggleSection(section.id)"
				>
					<N8nIcon
						v-if="ctx.isSectionComplete(section)"
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
						:icon="expandedSections[section.id] ? 'chevrons-down-up' : 'chevrons-up-down'"
						size="large"
						color="text-light"
					/>
				</div>
				<div
					v-if="expandedSections[section.id]"
					:class="$style.sectionContent"
					data-test-id="instance-ai-workflow-setup-section-body"
				>
					<WorkflowSetupSectionBody :section="section" />
				</div>
			</div>
		</div>

		<slot name="footer" />
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
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

// The parent section renders inline as the group card's primary body and
// belongs with the group header, so no separator is drawn above it.
.parentSection {
	border-top: none;
}

// The parent section sits directly under the group header; collapse its top
// padding so the header's own bottom padding dictates the gap.
.parentSection:first-child {
	padding-top: 0;
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
