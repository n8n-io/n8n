<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import type { UnpublishedWorkflowTool } from '../utils/validationIssues';
import AgentModal from './modals/AgentModal.vue';

export type AgentUnpublishedWorkflowsModalData = {
	workflows: UnpublishedWorkflowTool[];
};

const props = defineProps<{
	modalName: string;
	data: AgentUnpublishedWorkflowsModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const router = useRouter();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

function workflowHref(workflow: UnpublishedWorkflowTool): string {
	const { href } = router.resolve({
		name: VIEWS.WORKFLOW,
		params: { workflowId: workflow.workflowId ?? '' },
	});
	return href;
}

function closeModal() {
	uiStore.closeModal(props.modalName);
}
</script>

<template>
	<AgentModal
		:open="modalOpen"
		:title="i18n.baseText('agents.publish.modal.unpublishedWorkflows.title')"
		:show-cancel="false"
		size="large"
		data-testid="agent-unpublished-workflows-modal"
		@update:open="!$event && closeModal()"
	>
		<div :class="$style.content">
			<div :class="$style.header">
				<N8nIcon :class="$style.icon" icon="triangle-alert" color="warning" size="xlarge" />
				<N8nText size="medium">
					{{ i18n.baseText('agents.publish.modal.unpublishedWorkflows.description') }}
				</N8nText>
			</div>
			<ul :class="$style.list" data-testid="agent-unpublished-workflows-list">
				<li v-for="workflow in data.workflows" :key="workflow.workflowId ?? workflow.name">
					<a
						v-if="workflow.workflowId"
						:class="$style.link"
						:href="workflowHref(workflow)"
						target="_blank"
						rel="noopener"
						data-testid="agent-unpublished-workflow-link"
					>
						{{ workflow.name }}
					</a>
					<N8nText v-else>{{ workflow.name }}</N8nText>
				</li>
			</ul>
		</div>
		<template #footerActions>
			<N8nButton
				variant="solid"
				data-testid="agent-unpublished-workflows-got-it"
				@click="closeModal"
			>
				{{ i18n.baseText('agents.publish.modal.gotIt') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.header {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--xs);
}

.icon {
	flex-shrink: 0;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding-inline-start: var(--spacing--xl);
}

.link {
	color: var(--color--primary);
	cursor: pointer;
	text-decoration: underline;
}
</style>
