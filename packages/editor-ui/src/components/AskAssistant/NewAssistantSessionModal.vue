<script lang="ts" setup>
import { NEW_ASSISTANT_SESSION_MODAL } from '@/constants';
import Modal from '../Modal.vue';
import AssistantIcon from 'n8n-design-system/components/AskAssistantIcon/AssistantIcon.vue';
import AssistantText from 'n8n-design-system/components/AskAssistantText/AssistantText.vue';
import { useI18n } from '@/composables/useI18n';
import { useUIStore } from '@/stores/ui.store';
import type { ChatRequest } from '@/types/assistant.types';
import { useAssistantStore } from '@/stores/assistant.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';

const i18n = useI18n();
const uiStore = useUIStore();
const assistantStore = useAssistantStore();
const workflowsStore = useWorkflowsStore();
const telemetry = useTelemetry();

const props = defineProps<{
	name: string;
	data: {
		context: ChatRequest.ErrorContext;
	};
}>();

const close = () => {
	uiStore.closeModal(NEW_ASSISTANT_SESSION_MODAL);
};

const startNewSession = async () => {
	await assistantStore.initErrorHelper(props.data.context);
	telemetry.track('User opened assistant', {
		source: 'error',
		task: 'error',
		has_existing_session: true,
		workflow_id: workflowsStore.workflowId,
		node_type: props.data.context.node.type,
		error: props.data.context.error,
		chat_session_id: assistantStore.currentSessionId,
	});
	close();
};
</script>

<template>
	<Modal
		width="460px"
		height="250px"
		:name="NEW_ASSISTANT_SESSION_MODAL"
		:center="true"
		data-test-id="new-assistant-session-modal"
	>
		<template #header>
			{{ i18n.baseText('aiAssistant.newSessionModal.title.part1') }}
			<span :class="$style.assistantIcon"><AssistantIcon size="medium" /></span>
			<AssistantText size="xlarge" :text="i18n.baseText('aiAssistant.assistant')" />
			{{ i18n.baseText('aiAssistant.newSessionModal.title.part2') }}
		</template>
		<template #content>
			<div :class="$style.container">
				<p>
					<n8n-text>{{ i18n.baseText('aiAssistant.newSessionModal.message') }}</n8n-text>
				</p>
				<p>
					<n8n-text>{{ i18n.baseText('aiAssistant.newSessionModal.question') }}</n8n-text>
				</p>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<n8n-button :label="$locale.baseText('generic.cancel')" type="secondary" @click="close" />
				<n8n-button
					:label="$locale.baseText('aiAssistant.newSessionModal.confirm')"
					@click="startNewSession"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.container {
	p {
		line-height: normal;
	}
	p + p {
		margin-top: 10px;
	}
}

.assistantIcon {
	margin-right: var(--spacing-4xs);
}

.footer {
	display: flex;
	gap: 10px;
	justify-content: flex-end;
}
</style>
