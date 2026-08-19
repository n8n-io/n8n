<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nIconButton from '../N8nIconButton';
import N8nTooltip from '../N8nTooltip';
import type { ChatActionsProps } from './ChatActions.types';

defineOptions({ name: 'N8nChatActions' });

const { t } = useI18n();

const props = withDefaults(defineProps<ChatActionsProps>(), {
	showCopy: true,
	showReadAloud: true,
	isReadingAloud: false,
});

const emit = defineEmits<{
	copy: [];
	readAloud: [];
}>();

defineSlots<{
	default(): unknown;
}>();

const readAloudActionLabel = computed(function getReadAloudActionLabel() {
	return props.isReadingAloud
		? (props.stopReadingLabel ?? t('assistantChat.stopReading'))
		: (props.readAloudLabel ?? t('assistantChat.readAloud'));
});

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
				:data-test-id="copyTestId"
				@click="copyMessage"
			/>
		</N8nTooltip>
		<N8nTooltip v-if="showReadAloud !== false" :content="readAloudActionLabel" placement="bottom">
			<N8nIconButton
				:icon="isReadingAloud ? 'volume-x' : 'volume-2'"
				variant="ghost"
				size="small"
				icon-size="medium"
				:aria-label="readAloudActionLabel"
				:aria-pressed="isReadingAloud === true"
				:data-test-id="readAloudTestId"
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
