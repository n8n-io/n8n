<script lang="ts" setup>
import { computed } from 'vue';
import { NEW_ASSISTANT_SESSION_MODAL } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useChatPanelStore } from '../../chatPanel.store';
import type { ChatRequest } from '@/features/ai/assistant/assistant.types';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import type { ICredentialType } from 'n8n-workflow';

import {
	N8nAssistantIcon,
	N8nAssistantText,
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useWorkflowId } from '@/app/composables/useWorkflowId';

defineOptions({ inheritAttrs: false });
const i18n = useI18n();
const uiStore = useUIStore();
const assistantStore = useAssistantStore();
const chatPanelStore = useChatPanelStore();
const workflowId = useWorkflowId();

const props = defineProps<{
	name: string;
	data: {
		context: { errorHelp: ChatRequest.ErrorContext } | { credHelp: { credType: ICredentialType } };
	};
}>();

const modalOpen = computed(() => uiStore.modalsById[NEW_ASSISTANT_SESSION_MODAL]?.open === true);

const close = () => {
	uiStore.closeModal(NEW_ASSISTANT_SESSION_MODAL);
};

async function closeDialog() {
	close();
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

const startNewSession = async () => {
	if ('errorHelp' in props.data.context) {
		await chatPanelStore.openWithErrorHelper(props.data.context.errorHelp);
		assistantStore.trackUserOpenedAssistant({
			source: 'error',
			task: 'error',
			has_existing_session: true,
			workflowId: workflowId.value,
		});
	} else if ('credHelp' in props.data.context) {
		await chatPanelStore.openWithCredHelp(props.data.context.credHelp.credType);
	}
	close();
};
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		stacked
		data-test-id="new-assistant-session-modal"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ i18n.baseText('aiAssistant.newSessionModal.title.part1') }}
				<span :class="$style.assistantIcon"><N8nAssistantIcon size="medium" /></span>
				<N8nAssistantText size="xlarge" :text="i18n.baseText('aiAssistant.assistant')" />
				{{ i18n.baseText('aiAssistant.newSessionModal.title.part2') }}
			</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody :class="$style.container">
			<p>
				<N8nText>{{ i18n.baseText('aiAssistant.newSessionModal.message') }}</N8nText>
			</p>
			<p>
				<N8nText>{{ i18n.baseText('aiAssistant.newSessionModal.question') }}</N8nText>
			</p>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="outline" :label="i18n.baseText('generic.cancel')" @click="close" />
			<N8nButton
				:label="i18n.baseText('aiAssistant.newSessionModal.confirm')"
				@click="startNewSession"
			/>
		</N8nDialogFooter>
	</N8nDialog>
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
	margin-right: var(--spacing--4xs);
}
</style>
