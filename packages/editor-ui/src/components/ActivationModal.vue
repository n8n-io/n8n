<template>
	<Modal
		:name="WORKFLOW_ACTIVE_MODAL_KEY"
		width="40%"
		minWidth="400px"
		title="Workflow activated"
		:classic="true"
	>
		<template v-slot:content>
			<p>{{triggerContent}}</p>
			<p><span class="emphasised">These executions will not show up immediately in the editor</span>, but you can see them in the <a @click="showExecutionsList">execution list</a>.</p>
			<p>
				<el-checkbox v-model="checked" @change="handleCheckboxChange">Don't show again</el-checkbox>
			</p>
		</template>


		<template v-slot:footer="{ close }">
			<n8n-button @click="close" label="Got it"/>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';

import Modal from '@/components/Modal.vue';
import { WORKFLOW_ACTIVE_MODAL_KEY, EXECUTIONS_MODAL_KEY } from '../constants';
import { INodeUi } from '../Interface';
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
		handleCheckboxChange (checkboxValue: boolean) {
			window.localStorage.setItem('hideActivationAlert', checkboxValue.toString());
		},
	},
	computed: {
		triggerContent (): string {
			const foundTriggers = this.$store.getters.allNodes
				.filter(({ disabled }: INodeUi) => !disabled)
				.map(({ type }: INodeUi) => this.$store.getters.nodeType(type))
				.filter(((node: INodeTypeDescription) => node.group.includes('trigger')));
			// if multiple triggers
			if (foundTriggers.length > 1) {
				return 'Your triggers will now fire production executions automatically.';
			}
			const trigger = foundTriggers[0];
			const serviceName = trigger.displayName.replace(/ trigger/i, '');
			//check if webhook
			if (this.$store.getters.currentWorkflowHasWebhookNode) {
				if (trigger.name === 'n8n-nodes-base.webhook') {
					// check if a standard Webhook trigger
					return 'You can now make calls to your production webhook URL.';
				} else {
					return `Your workflow will now listen for events from ${serviceName} and trigger executions.`;
				}
			} else if (trigger.polling) {
				//check if a polling trigger
				return `Your workflow will now regularly check  ${serviceName}for events and trigger executions for them.`;
			} else if (trigger.name === 'n8n-nodes-base.cron') {
				// check if a standard Cron trigger
				return 'Your cron trigger will now trigger executions on the schedule you have defined.';
			} else if (trigger.name === 'n8n-nodes-base.interval') {
				// check if a standard Interval trigger
				return 'Your interval trigger will now trigger executions on the schedule you have defined.';
			} else if (trigger.name === 'n8n-nodes-base.workflowTrigger') {
				// check if a standard Workflow trigger
				return 'Your workflow will now trigger executions on the event you have defined.';
			} else if (trigger.name === 'n8n-nodes-base.sseTrigger') {
				// check if a standard SSE trigger
				return 'You can now make calls to your SSE URL to trigger executions.';
			} else {
				// default message
				return 'Your trigger will now fire production executions automatically.';
			}
		},
	},
});
</script>

<style scoped lang="scss">

.emphasised {
	font-weight: 600;
}

p {
	margin-top: 10px;
	font-size: 14px;
}

</style>
