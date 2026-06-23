<script setup lang="ts">
import CopyButton from '@/features/ai/chatHub/components/CopyButton.vue';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	content: string;
	isSpeechSynthesisAvailable: boolean;
	isSpeaking: boolean;
}>();

const emit = defineEmits<{
	readAloud: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.actions" data-test-id="agent-chat-message-actions">
		<CopyButton :content="content" data-test-id="agent-chat-message-copy" />
		<N8nTooltip v-if="isSpeechSynthesisAvailable" placement="bottom" :show-after="300">
			<N8nIconButton
				variant="ghost"
				:icon="isSpeaking ? 'volume-x' : 'volume-2'"
				size="small"
				icon-size="medium"
				data-test-id="agent-chat-message-read-aloud"
				@click="emit('readAloud')"
			/>
			<template #content>
				{{
					isSpeaking
						? i18n.baseText('chatHub.message.actions.stopReading')
						: i18n.baseText('chatHub.message.actions.readAloud')
				}}
			</template>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	align-items: center;
	margin-top: var(--spacing--4xs);
	margin-left: calc(var(--spacing--4xs) * -1);

	& g,
	& path {
		color: var(--icon-color);
		stroke-width: 2.5;
	}
}
</style>
