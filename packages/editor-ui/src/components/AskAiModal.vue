<template>
	<Modal
		width="460px"
		:center="true"
		:eventBus="modalBus"
		:name="ASK_AI_MODAL_KEY"
		:title="$locale.baseText('askAi.dialog.title')"
	>
		<template #content>
			<n8n-text v-html="$locale.baseText('askAi.dialog.body')"></n8n-text>
		</template>

		<template #footer>
			<n8n-link :to="ASK_AI_WAITLIST_URL">
				<n8n-button
					float="right"
					:label="$locale.baseText('askAi.dialog.signup')"
					@click="closeDialog"
				/>
			</n8n-link>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import Modal from './Modal.vue';
import { ASK_AI_MODAL_KEY, ASK_AI_WAITLIST_URL } from '../constants';

export default Vue.extend({
	name: 'AskAI',
	components: {
		Modal,
	},
	data() {
		return {
			ASK_AI_WAITLIST_URL,
			ASK_AI_MODAL_KEY,
			modalBus: new Vue(),
		};
	},
	methods: {
		closeDialog() {
			this.modalBus.$emit('close');
		},
	},
});
</script>

<style module lang="scss"></style>
