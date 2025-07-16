<script setup lang="ts">
import { computed } from 'vue';

import MessageRating from './MessageRating.vue';
import { useI18n } from '../../../composables/useI18n';
import type { ChatUI } from '../../../types/assistant';
import AssistantAvatar from '../../AskAssistantAvatar/AssistantAvatar.vue';
import N8nAvatar from '../../N8nAvatar';

interface Props {
	message: ChatUI.AssistantMessage;
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
	showRating?: boolean;
	ratingStyle?: 'regular' | 'minimal';
	showFeedback?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	showRating: false,
	ratingStyle: 'regular',
	showFeedback: true,
});

const emit = defineEmits<{
	rate: [rating: 'up' | 'down', feedback?: string];
}>();

const { t } = useI18n();

const isUserMessage = computed(() => props.message.role === 'user');

function onRate(rating: 'up' | 'down', feedback?: string) {
	emit('rate', rating, feedback);
}
</script>

<template>
	<div :class="$style.message">
		<div
			v-if="isFirstOfRole"
			:class="{ [$style.roleName]: true, [$style.userSection]: !isUserMessage }"
		>
			<template v-if="isUserMessage">
				<N8nAvatar :first-name="user?.firstName" :last-name="user?.lastName" size="xsmall" />
				<span>{{ t('assistantChat.you') }}</span>
			</template>
			<template v-else>
				<AssistantAvatar />
				<span>{{ t('assistantChat.aiAssistantName') }}</span>
			</template>
		</div>
		<slot></slot>
		<MessageRating
			v-if="showRating && !isUserMessage"
			:style="ratingStyle"
			:show-feedback="showFeedback"
			@rate="onRate"
		/>
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
