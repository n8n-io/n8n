<script setup lang="ts">
import { N8nIcon, N8nRadioButtons, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { ChatMode } from '../composables/useAgentChatMode';

defineProps<{
	modelValue: ChatMode;
	options: Array<{ label: string; value: ChatMode; disabled?: boolean }>;
	isBuilt: boolean;
	isBuildChatStreaming: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: ChatMode];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nTooltip
		:class="$style.chatModeToggle"
		:disabled="isBuilt"
		:content="i18n.baseText('agents.builder.chatMode.test.lockedTooltip')"
		:show-after="100"
		placement="top"
	>
		<N8nRadioButtons
			:model-value="modelValue"
			:options="options"
			:aria-label="i18n.baseText('agents.builder.chatMode.ariaLabel')"
			data-testid="agent-chat-mode-toggle"
			@update:model-value="emit('update:modelValue', $event)"
		>
			<template #option="option">
				<span :class="$style.chatModeOption">
					<N8nIcon
						v-if="option.value === 'build' && isBuildChatStreaming"
						icon="loader-circle"
						:size="14"
						:spin="true"
					/>
					<N8nIcon
						v-else-if="option.value === 'test' && !isBuilt"
						icon="triangle-alert"
						:size="14"
						:class="$style.chatModeLockedIcon"
					/>
					<N8nIcon
						v-else
						:icon="option.value === 'build' ? 'wand-sparkles' : 'message-square'"
						:size="14"
					/>
					<span>{{ option.label }}</span>
				</span>
			</template>
		</N8nRadioButtons>
	</N8nTooltip>
</template>

<style lang="scss" module>
.chatModeToggle {
	flex-shrink: 0;
}

.chatModeOption {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.chatModeLockedIcon {
	color: var(--text-color--warning);
}
</style>
