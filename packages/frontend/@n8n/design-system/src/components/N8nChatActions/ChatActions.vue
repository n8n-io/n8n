<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import N8nIconButton from '../N8nIconButton';
import N8nTooltip from '../N8nTooltip';
import type { ChatActionsProps } from './ChatActions.types';

defineOptions({ name: 'N8nChatActions' });

const { t } = useI18n();

defineProps<ChatActionsProps>();

const emit = defineEmits<{
	copy: [];
	readAloud: [];
}>();

defineSlots<{
	default(): unknown;
}>();

function copyMessage() {
	emit('copy');
}

function readMessageAloud() {
	emit('readAloud');
}
</script>

<template>
	<div :class="$style.actions" role="group" :aria-label="t('assistantChat.messageActions')">
		<N8nTooltip
			v-if="showCopy !== false"
			:content="copyLabel ?? t('assistantChat.copy')"
			placement="bottom"
		>
			<N8nIconButton
				icon="copy"
				variant="ghost"
				size="small"
				icon-size="medium"
				:aria-label="copyLabel ?? t('assistantChat.copy')"
				@click="copyMessage"
			/>
		</N8nTooltip>
		<N8nTooltip
			v-if="showReadAloud !== false"
			:content="readAloudLabel ?? t('assistantChat.readAloud')"
			placement="bottom"
		>
			<N8nIconButton
				icon="volume-2"
				variant="ghost"
				size="small"
				icon-size="medium"
				:aria-label="readAloudLabel ?? t('assistantChat.readAloud')"
				@click="readMessageAloud"
			/>
		</N8nTooltip>
		<slot />
	</div>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
