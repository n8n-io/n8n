<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useStyles } from '@/composables/useStyles';
import { useAssistantStore } from '@/features/assistant/assistant.store';
import { useBuilderStore } from '../../builder.store';
import { useChatPanelStore } from '../../chatPanel.store';
import { computed } from 'vue';

import { N8nAskAssistantButton, N8nAssistantAvatar, N8nTooltip } from '@n8n/design-system';

const assistantStore = useAssistantStore();
const builderStore = useBuilderStore();
const chatPanelStore = useChatPanelStore();
const i18n = useI18n();
const { APP_Z_INDEXES } = useStyles();

const lastUnread = computed(() => {
	const msg = assistantStore.lastUnread;
	if (msg?.type === 'block') {
		return msg.title;
	}
	if (msg?.type === 'text') {
		return msg.content;
	}
	if (msg?.type === 'code-diff') {
		return msg.description;
	}
	return '';
});

const onClick = async () => {
	if (builderStore.isAIBuilderEnabled) {
		// Toggle with appropriate mode based on current state
		if (chatPanelStore.isOpen && chatPanelStore.isBuilderModeActive) {
			chatPanelStore.close();
		} else {
			await chatPanelStore.open({ mode: 'builder' });
		}
	} else {
		// For assistant-only mode
		await chatPanelStore.toggle({ mode: 'assistant' });
	}
	if (chatPanelStore.isOpen) {
		assistantStore.trackUserOpenedAssistant({
			source: 'canvas',
			task: 'placeholder',
			has_existing_session: !assistantStore.isSessionEnded,
		});
	}
};
</script>

<template>
	<div :class="$style.container" data-test-id="ask-assistant-floating-button">
		<N8nTooltip
			:z-index="APP_Z_INDEXES.ASK_ASSISTANT_FLOATING_BUTTON_TOOLTIP"
			placement="top"
			:visible="!!lastUnread"
			:popper-class="$style.tooltip"
		>
			<template #content>
				<div :class="$style.text">{{ lastUnread }}</div>
				<div :class="$style.assistant">
					<N8nAssistantAvatar size="mini" />
					<span>{{ i18n.baseText('aiAssistant.name') }}</span>
				</div>
			</template>
			<N8nAskAssistantButton :unread-count="assistantStore.unreadCount" @click="onClick" />
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	position: absolute;
	right: var(--spacing--sm);
	bottom: var(--ask-assistant-floating-button-bottom-offset, --spacing--2xl);
	z-index: var(--z-index-ask-assistant-floating-button);
}

.tooltip {
	min-width: 150px;
	max-width: 265px !important;
	line-height: normal;
}

.assistant {
	font-size: var(--font-size--3xs);
	line-height: var(--spacing--sm);
	font-weight: var(--font-weight--bold);
	margin-top: var(--spacing--xs);

	> span {
		margin-left: var(--spacing--4xs);
	}
}

.text {
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 2; /* number of lines to show */
	line-clamp: 2;
	-webkit-box-orient: vertical;
}
</style>
