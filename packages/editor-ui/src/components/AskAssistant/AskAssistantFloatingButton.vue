<script setup lang="ts">
import { useAssistantStore } from '@/stores/assistant.store';
import AssistantAvatar from 'n8n-design-system/components/AskAssistantAvatar/AssistantAvatar.vue';
import AskAssistantButton from 'n8n-design-system/components/AskAssistantButton/AskAssistantButton.vue';
import { computed } from 'vue';

const assistantStore = useAssistantStore();

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

	return;
});
</script>

<template>
	<div
		v-if="assistantStore.canShowAssistantButtons && !assistantStore.isAssistantOpen"
		:class="$style.container"
	>
		<n8n-tooltip
			:z-index="4000"
			placement="top"
			:visible="!!lastUnread"
			:popper-class="$style.tooltip"
		>
			<template #content>
				<div :class="$style.text">{{ lastUnread }}</div>
				<div :class="$style.assistant">
					<AssistantAvatar size="mini" />
					<span>AI Assistant</span>
				</div>
			</template>
			<AskAssistantButton
				:unread-count="assistantStore.unreadCount"
				@click="assistantStore.openChat"
			/>
		</n8n-tooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	position: absolute;
	bottom: var(--spacing-s);
	right: var(--spacing-s);
	z-index: 3000;
}

.tooltip {
	min-width: 150px;
	max-width: 265px !important;
	line-height: normal;
}

.assistant {
	font-size: 10px;
	line-height: 16px;
	font-weight: 600;
	margin-top: 12px;
	> span {
		margin-left: 4px;
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
