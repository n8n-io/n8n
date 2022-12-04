<template>
	<Modal
		:name="WORKFLOW_ACTIVE_MODAL_KEY"
		:title="$locale.baseText('activationModal.workflowActivated')"
		width="460px"
	>
		<template #content>
			<div>
				<n8n-text>{{ triggerContent }}</n8n-text>
			</div>
			<div :class="$style.spaced">
				<n8n-text>
					<n8n-text :bold="true">
						{{ $locale.baseText('activationModal.theseExecutionsWillNotShowUp') }}
					</n8n-text>
					{{ $locale.baseText('activationModal.butYouCanSeeThem') }}
					<a @click="showExecutionsList">
						{{ $locale.baseText('activationModal.executionList') }}
					</a>
					{{ $locale.baseText('activationModal.ifYouChooseTo') }}
					<a @click="showSettings">{{ $locale.baseText('activationModal.saveExecutions') }}</a>
				</n8n-text>
			</div>
		</template>


		<template #footer="{ close }">
			<div :class="$style.footer">
				<el-checkbox :value="checked" @change="handleCheckboxChange">{{ $locale.baseText('activationModal.dontShowAgain') }}</el-checkbox>
				<n8n-button @click="close" :label="$locale.baseText('activationModal.gotIt')" />
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';

import Modal from '@/components/Modal.vue';
import { WORKFLOW_ACTIVE_MODAL_KEY, WORKFLOW_SETTINGS_MODAL_KEY, LOCAL_STORAGE_ACTIVATION_FLAG, VIEWS } from '../constants';
import { getActivatableTriggerNodes, getTriggerNodeServiceName } from '@/utils';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeTypesStore } from '@/stores/nodeTypes';

export default Vue.extend({
	name: 'ActivationModal',
	components: {
		Modal,
	},
	props: [
		'modalName',
	],
	data () {
		return {
			WORKFLOW_ACTIVE_MODAL_KEY,
			checked: false,
			modalBus: new Vue(),
		};
	},
	methods: {
		async showExecutionsList () {
			const activeExecution = this.workflowsStore.activeWorkflowExecution;
			const currentWorkflow = this.workflowsStore.workflowId;

			if (activeExecution) {
				this.$router.push({
					name: VIEWS.EXECUTION_PREVIEW,
					params: { name: currentWorkflow, executionId: activeExecution.id },
				}).catch(()=>{});;
			} else {
				this.$router.push({ name: VIEWS.EXECUTION_HOME, params: { name: currentWorkflow } }).catch(() => {});
			}
			this.uiStore.closeModal(WORKFLOW_ACTIVE_MODAL_KEY);
		},
		async showSettings() {
			this.uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
		},
		handleCheckboxChange (checkboxValue: boolean) {
			this.checked = checkboxValue;
			window.localStorage.setItem(LOCAL_STORAGE_ACTIVATION_FLAG, checkboxValue.toString());
		},
	},
	computed: {
		...mapStores(
			useNodeTypesStore,
			useUIStore,
			useWorkflowsStore,
		),
		triggerContent (): string {
			const foundTriggers = getActivatableTriggerNodes(this.workflowsStore.workflowTriggerNodes);
			if (!foundTriggers.length) {
				return '';
			}

			if (foundTriggers.length > 1) {
				return this.$locale.baseText('activationModal.yourTriggersWillNowFire');
			}

			const trigger = foundTriggers[0];

			const triggerNodeType = this.nodeTypesStore.getNodeType(trigger.type, trigger.typeVersion);
				if (triggerNodeType) {
					if (triggerNodeType.activationMessage) {
						return triggerNodeType.activationMessage;
					}

				const serviceName = getTriggerNodeServiceName(triggerNodeType);
				if (trigger.webhookId) {
					return this.$locale.baseText('activationModal.yourWorkflowWillNowListenForEvents', {
						interpolate: {
							serviceName,
						},
					});
				} else if (triggerNodeType.polling) {
					return this.$locale.baseText('activationModal.yourWorkflowWillNowRegularlyCheck', {
						interpolate: {
							serviceName,
						},
					});
				}
			}
			return this.$locale.baseText('activationModal.yourTriggerWillNowFire');
		},
	},
});
</script>

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
