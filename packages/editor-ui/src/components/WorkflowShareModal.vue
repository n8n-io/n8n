<template>
	<Modal
		width="540px"
		:title="$locale.baseText('workflows.shareModal.title', { interpolate: { name: workflow.name } })"
		:eventBus="modalBus"
		:name="WORKFLOW_SHARE_MODAL_KEY"
		:center="true"
	>
		<template slot="content">
			<div :class="$style.container">
				{{ workflow }}
			</div>
		</template>

		<template slot="footer">
			<div class="action-buttons">
				<n8n-button @click="closeDialog" float="right" :label="$locale.baseText('about.close')" />
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';
import Modal from './Modal.vue';
import { WORKFLOW_SHARE_MODAL_KEY } from '../constants';
import {IWorkflowDb} from "@/Interface";

export default Vue.extend({
	name: 'workflow-share-modal',
	components: {
		Modal,
	},
	data() {
		return {
			WORKFLOW_SHARE_MODAL_KEY,
			modalBus: new Vue(),
		};
	},
	computed: {
		workflow(): IWorkflowDb {
			return this.$store.getters.workflow;
		},
	},
	methods: {
		closeDialog() {
			this.modalBus.$emit('close');
		},
	},
});
</script>

<style module lang="scss">
.container > * {
	margin-bottom: var(--spacing-s);
	overflow-wrap: break-word;
}
</style>
