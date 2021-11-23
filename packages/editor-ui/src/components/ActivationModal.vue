<template>
	<Modal
		:name="WORKFLOW_ACTIVE_MODAL_KEY"
		width="40%"
		minWidth="620px"
		:classic="true"
	>
		<template v-slot:header>
			<n8n-heading tag="h1" size="xlarge" class="title">
				Workflow activated
			</n8n-heading>
		</template>

		<template v-slot:content>
			<p>{{alertTriggerContent}}</p>
			<p><span class="emphasised">These executions will not show up immediately in the editor</span>, but you can see them in the <a @click="showExecutionsList">execution list</a>.</p>
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

export default Vue.extend({
	name: 'ActivationModal',
	components: {
		Modal,
	},
	props: ['modalName'],
	data () {
		return {
			WORKFLOW_ACTIVE_MODAL_KEY,
		};
	},
	computed: {
		alertTriggerContent (): string {
			return '';
		},
	},
	methods: {
		async showExecutionsList () {
			this.$store.dispatch('ui/openModal', EXECUTIONS_MODAL_KEY);
		},
	},
});
</script>

<style scoped lang="scss">
</style>
