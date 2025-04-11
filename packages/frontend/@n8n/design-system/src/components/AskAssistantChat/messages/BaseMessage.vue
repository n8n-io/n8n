<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import type { ChatUI } from '../../../types/assistant';
import AssistantAvatar from '../../AskAssistantAvatar/AssistantAvatar.vue';

interface Props {
	message: ChatUI.AssistantMessage;
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

const props = defineProps<Props>();
const { t } = useI18n();

const isUserMessage = computed(() => props.message.role === 'user');
</script>

<template>
	<div :class="$style.message">
		<div
			v-if="isFirstOfRole"
			:class="{ [$style.roleName]: true, [$style.userSection]: !isUserMessage }"
		>
			<AssistantAvatar v-if="!isUserMessage" />
			<n8n-avatar v-else :first-name="user?.firstName" :last-name="user?.lastName" size="xsmall" />
			<span v-if="!isUserMessage">{{ t('assistantChat.aiAssistantName') }}</span>
			<span v-else>{{ t('assistantChat.you') }}</span>
		</div>
		<slot></slot>
	</div>
</template>

<style lang="scss" module>
.message {
	margin-bottom: var(--spacing-xs);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-xloose);
}

.roleName {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing-3xs);
	height: var(--spacing-xl);
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);

	> * {
		margin-right: var(--spacing-3xs);
	}
}

.userSection {
	margin-top: var(--spacing-m);
}
</style>
