<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useStyles } from '@/composables/useStyles';
import { useAssistantStore } from '@/stores/assistant.store';
import AssistantAvatar from '@n8n/design-system/components/AskAssistantAvatar/AssistantAvatar.vue';
import AskAssistantButton from '@n8n/design-system/components/AskAssistantButton/AskAssistantButton.vue';
import { useCssVar } from '@vueuse/core';
import { computed, watch } from 'vue';

const assistantStore = useAssistantStore();
const i18n = useI18n();
const { APP_Z_INDEXES } = useStyles();
const isVisible = computed(
	() =>
		assistantStore.canShowAssistantButtonsOnCanvas &&
		!assistantStore.isAssistantOpen &&
		!assistantStore.hideAssistantFloatingButton,
);
const heightCssVar = useCssVar('--ask-assistant-floating-button-height');

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

const onClick = () => {
	assistantStore.openChat();
	assistantStore.trackUserOpenedAssistant({
		source: 'canvas',
		task: 'placeholder',
		has_existing_session: !assistantStore.isSessionEnded,
	});
};

watch(
	isVisible,
	(visible) => {
		heightCssVar.value = `${visible ? 64 : 0}px`;
	},
	{ immediate: true },
);
</script>

<template>
	<div v-if="isVisible" :class="$style.container" data-test-id="ask-assistant-floating-button">
		<n8n-tooltip
			:z-index="APP_Z_INDEXES.ASK_ASSISTANT_FLOATING_BUTTON_TOOLTIP"
			placement="top"
			:visible="!!lastUnread"
			:popper-class="$style.tooltip"
		>
			<template #content>
				<div :class="$style.text">{{ lastUnread }}</div>
				<div :class="$style.assistant">
					<AssistantAvatar size="mini" />
					<span>{{ i18n.baseText('aiAssistant.name') }}</span>
				</div>
			</template>
			<AskAssistantButton :unread-count="assistantStore.unreadCount" @click="onClick" />
		</n8n-tooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	position: absolute;
	right: var(--spacing-s);
	z-index: var(--z-index-ask-assistant-floating-button);

	/* Account for logs panel height */
	bottom: calc(var(--logs-panel-height, 0px) + var(--spacing-s));

	/* When NDV is opened, bring to the bottom */
	body:has(#ndv) & {
		bottom: var(--spacing-s);
	}
}

.tooltip {
	min-width: 150px;
	max-width: 265px !important;
	line-height: normal;
}

.assistant {
	font-size: var(--font-size-3xs);
	line-height: var(--spacing-s);
	font-weight: var(--font-weight-bold);
	margin-top: var(--spacing-xs);
	> span {
		margin-left: var(--spacing-4xs);
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
