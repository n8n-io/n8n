<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import type { ChatMessage } from '@/features/ai/chatHub/chat.types';
import CopyButton from '@/features/ai/chatHub/components/CopyButton.vue';
import type { ChatMessageId } from '@n8n/api-types';
import { N8nIconButton, N8nLink, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const i18n = useI18n();
const router = useRouter();

const { message, alternatives, isSpeaking, isSpeechSynthesisAvailable } = defineProps<{
	message: ChatMessage;
	alternatives: ChatMessageId[];
	isSpeechSynthesisAvailable: boolean;
	isSpeaking: boolean;
}>();

const emit = defineEmits<{
	edit: [];
	regenerate: [];
	switchAlternative: [messageId: ChatMessageId];
	readAloud: [];
}>();

const currentAlternativeIndex = computed(() => {
	return alternatives.findIndex((id) => id === message.id);
});

const executionUrl = computed(() => {
	if (message.type === 'ai' && message.provider === 'n8n' && message.executionId) {
		return router.resolve({
			name: VIEWS.EXECUTION_PREVIEW,
			params: { name: message.workflowId, executionId: message.executionId },
		}).href;
	}
	return undefined;
});

function handleEdit() {
	emit('edit');
}

function handleRegenerate() {
	emit('regenerate');
}

function handleReadAloud() {
	emit('readAloud');
}
</script>

<template>
	<div :class="$style.actions">
		<CopyButton :content="message.content" />
		<N8nTooltip
			v-if="isSpeechSynthesisAvailable && message.type === 'ai'"
			placement="bottom"
			:show-after="300"
		>
			<N8nIconButton
				:icon="isSpeaking ? 'volume-x' : 'volume-2'"
				type="tertiary"
				size="medium"
				text
				@click="handleReadAloud"
			/>
			<template #content>{{
				isSpeaking
					? i18n.baseText('chatHub.message.actions.stopReading')
					: i18n.baseText('chatHub.message.actions.readAloud')
			}}</template>
		</N8nTooltip>
		<N8nTooltip v-if="message.status === 'success'" placement="bottom" :show-after="300">
			<N8nIconButton icon="pen" type="tertiary" size="medium" text @click="handleEdit" />
			<template #content>{{ i18n.baseText('chatHub.message.actions.edit') }}</template>
		</N8nTooltip>
		<N8nTooltip v-if="message.type === 'ai'" placement="bottom" :show-after="300">
			<N8nIconButton
				icon="refresh-cw"
				type="tertiary"
				size="medium"
				text
				@click="handleRegenerate"
			/>
			<template #content>{{ i18n.baseText('chatHub.message.actions.regenerate') }}</template>
		</N8nTooltip>
		<N8nTooltip v-if="executionUrl && message.executionId" placement="bottom" :show-after="300">
			<N8nIconButton icon="info" type="tertiary" size="medium" text />
			<template #content>
				{{ i18n.baseText('chatHub.message.actions.executionId') }}:
				<N8nLink :to="executionUrl" :new-window="true">
					{{ message.executionId }}
				</N8nLink>
			</template>
		</N8nTooltip>
		<template v-if="alternatives.length > 1">
			<N8nIconButton
				icon="chevron-left"
				type="tertiary"
				size="medium"
				text
				:disabled="currentAlternativeIndex === 0"
				@click="$emit('switchAlternative', alternatives[currentAlternativeIndex - 1])"
			/>
			<N8nText size="medium" color="text-base">
				{{ `${currentAlternativeIndex + 1}/${alternatives.length}` }}
			</N8nText>
			<N8nIconButton
				icon="chevron-right"
				type="tertiary"
				size="medium"
				text
				:disabled="currentAlternativeIndex === alternatives.length - 1"
				@click="$emit('switchAlternative', alternatives[currentAlternativeIndex + 1])"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	align-items: center;

	& g,
	& path {
		color: var(--color--text--tint-1);
		stroke-width: 2.5;
	}
}
</style>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
