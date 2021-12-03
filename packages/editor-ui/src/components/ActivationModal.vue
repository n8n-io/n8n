<template>
	<Modal
		:name="WORKFLOW_ACTIVE_MODAL_KEY"
		width="460px"
		minWidth="350px"
		title="Workflow activated"
	>
		<template v-slot:content>
			<div>
				<n8n-text>{{triggerContent}}</n8n-text>
			</div>
			<div :class="$style.spaced">
				<n8n-text><n8n-text :bold="true">These executions will not show up immediately in the editor</n8n-text>, but you can see them in the <a @click="showExecutionsList">execution list</a>.</n8n-text>
			</div>
		</template>


		<template v-slot:footer="{ close }">
			<div :class="$style.footer">
				<el-checkbox :value="checked" @change="handleCheckboxChange">Don't show again</el-checkbox>
				<n8n-button @click="close" label="Got it"/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">

import Vue from 'vue';

import Modal from '@/components/Modal.vue';
import { WORKFLOW_ACTIVE_MODAL_KEY, EXECUTIONS_MODAL_KEY, LOCAL_STORAGE_ACTIVATION_FLAG } from '../constants';
import { INodeUi } from '../Interface';
import { getTriggerNodeServiceName } from './helpers';

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
		handleCheckboxChange (checkboxValue: boolean) {
			this.checked = checkboxValue;
			window.localStorage.setItem(LOCAL_STORAGE_ACTIVATION_FLAG, checkboxValue.toString());
		},
	},
	computed: {
		triggerContent (): string {
			const foundTriggers = this.$store.getters.workflowTriggerNodes
				.filter((node: INodeUi) => {
					return !node.disabled;
				});
			// if multiple triggers
			if (foundTriggers.length > 1) {
				return 'Your triggers will now fire production executions automatically.';
			}
			const trigger = foundTriggers[0];
			const originalTrigger = this.$store.getters.nodeType(trigger.type);

			if (originalTrigger.activationMessage) {
				return originalTrigger.activationMessage;
			}
			const serviceName = getTriggerNodeServiceName(originalTrigger.displayName);
			//check if webhook
			if (trigger.webhookId) {
				return `Your workflow will now listen for events from ${serviceName} and trigger executions.`;
			} else if (originalTrigger.polling) {
				//check if a polling trigger
				return `Your workflow will now regularly check ${serviceName} for events and trigger executions for them.`;
			} else {
				// default message
				return 'Your trigger will now fire production executions automatically.';
			}
		},
	},
});
</script>


<style lang="scss" module>

.emphasised {
	font-weight: var(--font-weight-bold);
}

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
