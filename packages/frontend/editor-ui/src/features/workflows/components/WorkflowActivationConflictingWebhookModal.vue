<script setup lang="ts">
import { WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

import { useRootStore } from '@n8n/stores/useRootStore';
import { computed } from 'vue';
import { CHAT_TRIGGER_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
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
	const suggestionBase = ' and activate this one, or ';

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

const modalOpen = computed(
	() => uiStore.modalsById[WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY]?.open === true,
);

const onClick = async () => {
	if (uiStore.modalsById[WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY]?.open !== true) return;
	uiStore.closeModal(WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY);
};

function onDialogOpenUpdate(open: boolean) {
	if (!open) void onClick();
}
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="large"
		:header="`Conflicting ${webhookTypeUi.title} Path`"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<div data-test-id="workflowActivationConflictingWebhook-modal">
				<N8nCallout theme="danger" data-test-id="conflicting-webhook-callout">
					A {{ webhookTypeUi.callout }} '{{ data.node }}' in the workflow '{{ data.workflowName }}'
					uses a conflicting URL path, so this workflow cannot be activated
				</N8nCallout>
				<div>
					<div>
						<N8nText color="text-base"> You can deactivate </N8nText>
						<N8nLink :to="workflowUrl" :underline="true">{{ data.workflowName }}</N8nLink>
						{{ ' ' }}
						<N8nText color="text-base" data-test-id="conflicting-webhook-suggestion">
							{{ webhookTypeUi.suggestion }}
						</N8nText>
					</div>
				</div>
				<div data-test-id="conflicting-webhook-path">
					<N8nText color="text-light"> {{ webhookUrl }}/</N8nText>
					<N8nText color="text-dark" bold>
						{{ data.webhookPath }}
					</N8nText>
				</div>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				label="Done"
				size="medium"
				float="right"
				data-test-id="close-button"
				@click="onClick"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>
