<script setup lang="ts">
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from '@/components/Modal.vue';
import { WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY } from '@/constants';
import { useUIStore } from '@/stores/ui.store';

import { useRootStore } from '@n8n/stores/useRootStore';
import { computed } from 'vue';
import { CHAT_TRIGGER_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE } from 'n8n-workflow';

const modalBus = createEventBus();
const uiStore = useUIStore();
const rootStore = useRootStore();

const props = defineProps<{
	data: {
		workflowName: string;
		triggerType: string;
		workflowId: string;
		webhookPath: string;
		node: string;
	};
}>();

const { data } = props;

const webhookUrl = computed(() => {
	return rootStore.webhookUrl;
});

const webhookTypeUi = computed((): { title: string; callout: string; suggestion: string } => {
	const suggestionBase = 'and activate this one, or ';

	if (data.triggerType === FORM_TRIGGER_NODE_TYPE)
		return {
			title: 'Form',
			callout: 'form trigger',
			suggestion: suggestionBase + 'adjust the following URL path in either workflow:',
		};
	if (data.triggerType === CHAT_TRIGGER_NODE_TYPE)
		return {
			title: 'Chat',
			callout: 'chat trigger',
			suggestion: suggestionBase + 'insert a new Chat Trigger node in either workflow:',
		};
	if (data.triggerType === WEBHOOK_NODE_TYPE)
		return {
			title: 'Webhook',
			callout: 'webhook trigger',
			suggestion: suggestionBase + 'adjust the following URL path in either workflow:',
		};

	return {
		title: 'Trigger',
		callout: 'trigger',
		suggestion: suggestionBase + 'insert a new trigger node of the same type in either workflow:',
	};
});

const workflowUrl = computed(() => {
	return rootStore.urlBaseEditor + 'workflow/' + data.workflowId;
});

const onClick = async () => {
	uiStore.closeModal(WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY);
};
</script>

<template>
	<Modal
		width="540px"
		:name="WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY"
		:title="`Conflicting ${webhookTypeUi.title} Path`"
		:event-bus="modalBus"
		:center="true"
	>
		<template #content>
			<n8n-callout theme="danger" data-test-id="conflicting-webhook-callout">
				A {{ webhookTypeUi.callout }} '{{ data.node }}' in the workflow '{{ data.workflowName }}'
				uses a conflicting URL path, so this workflow cannot be activated
			</n8n-callout>
			<div :class="$style.container">
				<div>
					<n8n-text color="text-base"> You can deactivate </n8n-text>
					<n8n-link :to="workflowUrl" :underline="true"> {{ data.workflowName }} </n8n-link>
					<n8n-text color="text-base" data-test-id="conflicting-webhook-suggestion">
						{{ webhookTypeUi.suggestion }}
					</n8n-text>
				</div>
			</div>
			<div data-test-id="conflicting-webhook-path">
				<n8n-text color="text-light"> {{ webhookUrl }}/</n8n-text>
				<n8n-text color="text-dark" bold>
					{{ data.webhookPath }}
				</n8n-text>
			</div>
		</template>
		<template #footer>
			<n8n-button
				label="Done"
				size="medium"
				float="right"
				data-test-id="close-button"
				@click="onClick"
			/>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container {
	margin-top: var(--spacing-m);
	margin-bottom: var(--spacing-s);
}
</style>
