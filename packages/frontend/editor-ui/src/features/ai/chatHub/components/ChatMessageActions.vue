<script setup lang="ts">
import type { ChatHubMessageType, ChatMessageId } from '@n8n/api-types';
import { N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const i18n = useI18n();

const { type, justCopied, messageId, alternatives, isSpeaking, isSpeechSynthesisAvailable } =
	defineProps<{
		type: ChatHubMessageType;
		justCopied: boolean;
		messageId: ChatMessageId;
		alternatives: ChatMessageId[];
		isSpeechSynthesisAvailable: boolean;
		isSpeaking: boolean;
	}>();

const emit = defineEmits<{
	copy: [];
	edit: [];
	regenerate: [];
	switchAlternative: [messageId: ChatMessageId];
	readAloud: [];
}>();

const copyTooltip = computed(() => {
	return justCopied ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy');
});

const currentAlternativeIndex = computed(() => {
	return alternatives.findIndex((id) => id === messageId);
});

function handleCopy() {
	emit('copy');
}

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
		<N8nTooltip placement="bottom" :show-after="300">
			<N8nIconButton
				:icon="justCopied ? 'check' : 'copy'"
				type="tertiary"
				size="medium"
				text
				@click="handleCopy"
			/>
			<template #content>{{ copyTooltip }}</template>
		</N8nTooltip>
		<N8nTooltip
			v-if="isSpeechSynthesisAvailable && type === 'ai'"
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
			<template #content>{{ isSpeaking ? 'Stop reading' : 'Read aloud' }}</template>
		</N8nTooltip>
		<N8nTooltip placement="bottom" :show-after="300">
			<N8nIconButton icon="pen" type="tertiary" size="medium" text @click="handleEdit" />
			<template #content>Edit</template>
		</N8nTooltip>
		<N8nTooltip v-if="type === 'ai'" placement="bottom" :show-after="300">
			<N8nIconButton
				icon="refresh-cw"
				type="tertiary"
				size="medium"
				text
				@click="handleRegenerate"
			/>
			<template #content>Regenerate</template>
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
