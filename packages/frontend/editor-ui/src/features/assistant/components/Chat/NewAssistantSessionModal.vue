<script lang="ts" setup>
import { NEW_ASSISTANT_SESSION_MODAL } from '@/constants';
import Modal from '@/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/stores/ui.store';
import { useChatPanelStore } from '../../chatPanel.store';
import type { ChatRequest } from '@/features/assistant/assistant.types';
import { useAssistantStore } from '@/features/assistant/assistant.store';
import type { ICredentialType } from 'n8n-workflow';

import { N8nAssistantIcon, N8nAssistantText, N8nButton, N8nText } from '@n8n/design-system';

const i18n = useI18n();
const uiStore = useUIStore();
const assistantStore = useAssistantStore();
const chatPanelStore = useChatPanelStore();

const props = defineProps<{
	name: string;
	data: {
		context: { errorHelp: ChatRequest.ErrorContext } | { credHelp: { credType: ICredentialType } };
	};
}>();

const close = () => {
	uiStore.closeModal(NEW_ASSISTANT_SESSION_MODAL);
};

const startNewSession = async () => {
	if ('errorHelp' in props.data.context) {
		await chatPanelStore.openWithErrorHelper(props.data.context.errorHelp);
		assistantStore.trackUserOpenedAssistant({
			source: 'error',
			task: 'error',
			has_existing_session: true,
		});
	} else if ('credHelp' in props.data.context) {
		await chatPanelStore.openWithCredHelp(props.data.context.credHelp.credType);
	}
	close();
};
</script>

<template>
	<Modal
		width="460px"
		height="250px"
		data-test-id="new-assistant-session-modal"
		:name="NEW_ASSISTANT_SESSION_MODAL"
		:center="true"
		:append-to-body="true"
	>
		<template #header>
			{{ i18n.baseText('aiAssistant.newSessionModal.title.part1') }}
			<span :class="$style.assistantIcon"><N8nAssistantIcon size="medium" /></span>
			<N8nAssistantText size="xlarge" :text="i18n.baseText('aiAssistant.assistant')" />
			{{ i18n.baseText('aiAssistant.newSessionModal.title.part2') }}
		</template>
		<template #content>
			<div :class="$style.container">
				<p>
					<N8nText>{{ i18n.baseText('aiAssistant.newSessionModal.message') }}</N8nText>
				</p>
				<p>
					<N8nText>{{ i18n.baseText('aiAssistant.newSessionModal.question') }}</N8nText>
				</p>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton :label="i18n.baseText('generic.cancel')" type="secondary" @click="close" />
				<N8nButton
					:label="i18n.baseText('aiAssistant.newSessionModal.confirm')"
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
	margin-right: var(--spacing--4xs);
}

.footer {
	display: flex;
	gap: 10px;
	justify-content: flex-end;
}
</style>
