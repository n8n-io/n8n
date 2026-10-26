<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { v4 as uuid } from 'uuid';
import { N8nButton, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { AGENT_DECISION_TRIGGER_NODE_TYPE, type AgentHitlConfiguration } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import AgentModal from './modals/AgentModal.vue';

const props = defineProps<{
	projectId: string;
	configuration?: AgentHitlConfiguration;
	nextNumber: number;
}>();
const emit = defineEmits<{
	save: [configuration: AgentHitlConfiguration];
	close: [];
	remove: [];
}>();
const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const workflowsStore = useWorkflowsStore();
const workflowList = useWorkflowsListStore();
const name = ref(
	props.configuration?.name ??
		i18n.baseText('agents.hitl.defaultName', { interpolate: { number: String(props.nextNumber) } }),
);
const workflowId = ref(props.configuration?.workflowId ?? '');
const workflows = ref<Array<{ id: string; name: string }>>([]);
const loading = ref(false);

async function load() {
	try {
		workflows.value = await workflowList.searchWorkflows({
			projectId: props.projectId,
			triggerNodeTypes: [AGENT_DECISION_TRIGGER_NODE_TYPE],
			isArchived: false,
			select: ['id', 'name'],
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.hitl.loadFailed'));
	}
}
onMounted(load);

async function createWorkflow() {
	loading.value = true;
	try {
		const triggerId = uuid();
		const workflow = await workflowsStore.createNewWorkflow({
			name: name.value.trim(),
			projectId: props.projectId,
			nodes: [
				{
					id: triggerId,
					name: 'Agent decision',
					type: AGENT_DECISION_TRIGGER_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: uuid(),
					name: 'Respond to Agent decision',
					type: 'n8n-nodes-base.agentDecisionResponse',
					typeVersion: 1,
					position: [480, 0],
					parameters: { approved: false },
				},
			],
			connections: {
				'Agent decision': {
					main: [[{ node: 'Respond to Agent decision', type: 'main', index: 0 }]],
				},
			},
		});
		workflows.value = [...workflows.value, { id: workflow.id, name: workflow.name }];
		workflowId.value = workflow.id;
		const { href } = router.resolve({
			name: VIEWS.WORKFLOW,
			params: { workflowId: workflow.id, nodeId: triggerId },
		});
		window.open(href, '_blank');
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.hitl.createFailed'));
	} finally {
		loading.value = false;
	}
}

function save() {
	if (!name.value.trim() || !workflowId.value) return;
	emit('save', {
		id: props.configuration?.id ?? uuid(),
		name: name.value.trim(),
		method: 'workflow',
		workflowId: workflowId.value,
	});
}
</script>

<template>
	<AgentModal
		:open="true"
		v-model:title="name"
		editable-title
		size="medium"
		:busy="loading"
		stacked
		@update:open="emit('close')"
	>
		<div :class="$style.fields">
			<N8nText>{{ i18n.baseText('agents.hitl.workflowHelp') }}</N8nText>
			<label for="hitl-workflow">{{ i18n.baseText('agents.hitl.workflow') }}</label>
			<N8nSelect
				id="hitl-workflow"
				v-model="workflowId"
				filterable
				:teleported="false"
				data-testid="agent-hitl-workflow"
			>
				<N8nOption
					v-for="workflow in workflows"
					:key="workflow.id"
					:value="workflow.id"
					:label="workflow.name"
				/>
			</N8nSelect>
			<N8nButton
				type="secondary"
				:label="i18n.baseText('agents.hitl.createWorkflow')"
				:loading="loading"
				@click="createWorkflow"
			/>
			<N8nText size="small" color="text-light">{{ i18n.baseText('agents.hitl.noExpiry') }}</N8nText>
		</div>
		<template v-if="configuration" #footerLeft>
			<N8nButton
				type="tertiary"
				:label="i18n.baseText('agents.hitl.remove')"
				@click="emit('remove')"
			/>
		</template>
		<template #footerActions>
			<N8nButton
				:label="i18n.baseText('agents.hitl.save')"
				:disabled="!name.trim() || !workflowId"
				@click="save"
			/>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
