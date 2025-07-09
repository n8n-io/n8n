<script setup lang="ts">
import { computed, ref } from 'vue';

import Modal from '@/components/Modal.vue';
import {
	WORKFLOW_ACTIVE_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
	LOCAL_STORAGE_ACTIVATION_FLAG,
	VIEWS,
} from '../constants';
import { getActivatableTriggerNodes, getTriggerNodeServiceName } from '@/utils/nodeTypesUtils';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useStorage } from '@/composables/useStorage';
import { useExecutionsStore } from '@/stores/executions.store';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';

const checked = ref(false);

const executionsStore = useExecutionsStore();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();

const router = useRouter();
const i18n = useI18n();

const triggerContent = computed(() => {
	const foundTriggers = getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes);
	if (!foundTriggers.length) {
		return '';
	}

	if (foundTriggers.length > 1) {
		return i18n.baseText('activationModal.yourTriggersWillNowFire');
	}

	const trigger = foundTriggers[0];

	const triggerNodeType = nodeTypesStore.getNodeType(trigger.type, trigger.typeVersion);
	if (triggerNodeType) {
		if (triggerNodeType.activationMessage) {
			return triggerNodeType.activationMessage;
		}

		const serviceName = getTriggerNodeServiceName(triggerNodeType);
		if (trigger.webhookId) {
			return i18n.baseText('activationModal.yourWorkflowWillNowListenForEvents', {
				interpolate: {
					serviceName,
				},
			});
		} else if (triggerNodeType.polling) {
			return i18n.baseText('activationModal.yourWorkflowWillNowRegularlyCheck', {
				interpolate: {
					serviceName,
				},
			});
		}
	}
	return i18n.baseText('activationModal.yourTriggerWillNowFire');
});

const showExecutionsList = async () => {
	const activeExecution = executionsStore.activeExecution;
	const currentWorkflow = workflowsStore.workflowId;

	if (activeExecution) {
		router
			.push({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { name: currentWorkflow, executionId: activeExecution.id },
			})
			.catch(() => {});
	} else {
		router.push({ name: VIEWS.EXECUTION_HOME, params: { name: currentWorkflow } }).catch(() => {});
	}
	uiStore.closeModal(WORKFLOW_ACTIVE_MODAL_KEY);
};

const showSettings = async () => {
	uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
};

const handleCheckboxChange = (checkboxValue: boolean) => {
	checked.value = checkboxValue;
	useStorage(LOCAL_STORAGE_ACTIVATION_FLAG).value = checkboxValue.toString();
};
</script>

<template>
	<Modal
		:name="WORKFLOW_ACTIVE_MODAL_KEY"
		:title="i18n.baseText('activationModal.workflowActivated')"
		width="460px"
	>
		<template #content>
			<div>
				<n8n-text>{{ triggerContent }}</n8n-text>
			</div>
			<div :class="$style.spaced">
				<n8n-text>
					<n8n-text :bold="true">
						{{ i18n.baseText('activationModal.theseExecutionsWillNotShowUp') }}
					</n8n-text>
					{{ i18n.baseText('activationModal.butYouCanSeeThem') }}
					<a @click="showExecutionsList">
						{{ i18n.baseText('activationModal.executionList') }}
					</a>
					{{ i18n.baseText('activationModal.ifYouChooseTo') }}
					<a @click="showSettings">{{ i18n.baseText('activationModal.saveExecutions') }}</a>
				</n8n-text>
			</div>
		</template>

		<template #footer="{ close }">
			<div :class="$style.footer">
				<el-checkbox :model-value="checked" @update:model-value="handleCheckboxChange">{{
					i18n.baseText('generic.dontShowAgain')
				}}</el-checkbox>
				<n8n-button :label="i18n.baseText('activationModal.gotIt')" @click="close" />
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.spaced {
	margin-top: var(--spacing-2xs);
}

.footer {
	text-align: right;

	> * {
		margin-left: var(--spacing-s);
	}
}
</style>
