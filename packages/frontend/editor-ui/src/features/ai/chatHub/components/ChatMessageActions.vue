<script setup lang="ts">
import type { ChatMessage } from '@/features/ai/chatHub/chat.types';
import type { ChatMessageId } from '@n8n/api-types';
import {
	type ActionDropdownItem,
	N8nActionDropdown,
	N8nIconButton,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

type MenuAction = 'open-execution';

const { justCopied, message, alternatives, isSpeaking, isSpeechSynthesisAvailable } = defineProps<{
	justCopied: boolean;
	message: ChatMessage;
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
	openExecution: [];
}>();

const i18n = useI18n();

const copyTooltip = computed(() => {
	return justCopied ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy');
});

const currentAlternativeIndex = computed(() => {
	return alternatives.findIndex((id) => id === message.id);
});

const menuItems = computed<Array<ActionDropdownItem<MenuAction>>>(() =>
	message.executionId ? [{ id: 'open-execution', label: 'Open execution' }] : [],
);

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

function handleSelectMenu(action: MenuAction) {
	switch (action) {
		case 'open-execution':
			emit('openExecution');
	}
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
			<template #content>{{ isSpeaking ? 'Stop reading' : 'Read aloud' }}</template>
		</N8nTooltip>
		<N8nTooltip placement="bottom" :show-after="300">
			<N8nIconButton icon="pen" type="tertiary" size="medium" text @click="handleEdit" />
			<template #content>Edit</template>
		</N8nTooltip>
		<N8nTooltip v-if="message.type === 'ai'" placement="bottom" :show-after="300">
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
		<N8nActionDropdown
			v-if="menuItems.length > 0"
			:items="menuItems"
			placement="bottom-start"
			@select="handleSelectMenu"
			@click.stop
		>
			<template #activator>
				<N8nIconButton icon="ellipsis-vertical" type="tertiary" text />
			</template>
		</N8nActionDropdown>
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
