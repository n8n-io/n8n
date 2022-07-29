<template>
	<Modal
		:name="WORKFLOW_ACTIVE_MODAL_KEY"
		:title="$locale.baseText('activationModal.workflowActivated')"
		width="460px"
	>
		<template v-slot:content>
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


		<template v-slot:footer="{ close }">
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
import { WORKFLOW_ACTIVE_MODAL_KEY, EXECUTIONS_MODAL_KEY, WORKFLOW_SETTINGS_MODAL_KEY, LOCAL_STORAGE_ACTIVATION_FLAG } from '../constants';
import { getActivatableTriggerNodes, getTriggerNodeServiceName } from './helpers';
import { INodeTypeDescription } from 'n8n-workflow';

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
		};
	},
	methods: {
		async showExecutionsList () {
			this.$store.dispatch('ui/openModal', EXECUTIONS_MODAL_KEY);
		},
		async showSettings() {
			this.$store.dispatch('ui/openModal', WORKFLOW_SETTINGS_MODAL_KEY);
		},
		handleCheckboxChange (checkboxValue: boolean) {
			this.checked = checkboxValue;
			window.localStorage.setItem(LOCAL_STORAGE_ACTIVATION_FLAG, checkboxValue.toString());
		},
	},
	computed: {
		triggerContent (): string {
			const foundTriggers = getActivatableTriggerNodes(this.$store.getters.workflowTriggerNodes);
			if (!foundTriggers.length) {
				return '';
			}

			if (foundTriggers.length > 1) {
				return this.$locale.baseText('activationModal.yourTriggersWillNowFire');
			}

			const trigger = foundTriggers[0];

			const triggerNodeType = this.$store.getters['nodeTypes/getNodeType'](trigger.type, trigger.typeVersion) as INodeTypeDescription;
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
			} else {
				return this.$locale.baseText('activationModal.yourTriggerWillNowFire');
			}
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
