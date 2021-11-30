<template>
	<Modal
		:name="WORKFLOW_ACTIVE_MODAL_KEY"
		width="460px"
		minWidth="350px"
		title="Workflow activated"
	>
		<template v-slot:content>
			<p :class="$style.p">{{triggerContent}}</p>
			<p :class="[$style.p, $style.spaced]"><span :class="$style.emphasised">These executions will not show up immediately in the editor</span>, but you can see them in the <a @click="showExecutionsList">execution list</a>.</p>
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

import Modal from '@/components/Modal.vue';
import { WORKFLOW_ACTIVE_MODAL_KEY, EXECUTIONS_MODAL_KEY, LOCAL_STORAGE_ACTIVATION_FLAG } from '../constants';
import { INodeUi } from '../Interface';
import mixins from 'vue-typed-mixins';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';


export default mixins(workflowHelpers).extend({
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
			const foundTriggers = this.$store.getters.worklfowEnabledTriggerNodes
				.map(({ type }: INodeUi) => this.$store.getters.nodeType(type));
			// if multiple triggers
			if (foundTriggers.length > 1) {
				return 'Your triggers will now fire production executions automatically.';
			}
			const trigger = foundTriggers[0];
			if (trigger.activationMessage) {
				return trigger.activationMessage;
			}
			const serviceName = this.getNodeName(trigger.displayName);
			//check if webhook
			if (trigger.webhookId) {
				return `Your workflow will now listen for events from ${serviceName} and trigger executions.`;
			} else if (trigger.polling) {
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

.p {
	font-size: var(--font-size-s);
	line-height: 19px;
}

.spaced {
	margin-top: var(--spacing-2xs);
}

.footer {
	text-align: right;

	button {
		margin-left: var(--spacing-s);
		line-height: 14px;
	}
}

</style>
