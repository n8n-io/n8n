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
					@click="onAskAiWaitlistClick"
				/>
			</n8n-link>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Modal from './Modal.vue';
import { ASK_AI_MODAL_KEY, ASK_AI_WAITLIST_URL } from '../constants';
import { createEventBus } from 'n8n-design-system';

export default defineComponent({
	name: 'AskAI',
	components: {
		Modal,
	},
	data() {
		return {
			ASK_AI_WAITLIST_URL,
			ASK_AI_MODAL_KEY,
			modalBus: createEventBus(),
		};
	},
	methods: {
		onAskAiWaitlistClick() {
			this.$telemetry.track('User clicked join waitlist', { source: 'ask-ai-code' });
			this.modalBus.emit('close');
		},
	},
});
</script>

<style module lang="scss"></style>
