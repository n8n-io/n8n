<script setup lang="ts">
import { computed } from 'vue';
import BaseMessage from './BaseMessage.vue';
import { useI18n } from '../../../composables/useI18n';
import type { ChatUI } from '../../../types/assistant';
import N8nIcon from '../../N8nIcon';
import N8nIconButton from '../../N8nIconButton';

interface Props {
	message: ChatUI.VersionCardMessage & { read?: boolean };
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

const props = defineProps<Props>();

const emit = defineEmits<{
	restore: [versionId: string];
}>();

const { t } = useI18n();

const formattedDate = computed(() => {
	const date = new Date(props.message.createdAt);
	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
});

function handleRestore() {
	emit('restore', props.message.versionId);
}
</script>

<template>
	<!-- @todo basemessage needed? -->
	<BaseMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		<div :class="$style.versionCard" data-test-id="version-card">
			<div :class="$style.iconWrapper">
				<N8nIcon icon="history" size="small" :class="$style.historyIcon" />
			</div>
			<div :class="$style.content">
				<span :class="$style.timestamp">{{ formattedDate }}</span>
			</div>
			<N8nIconButton
				icon="undo-2"
				type="tertiary"
				size="small"
				:title="t('aiAssistant.versionCard.restore')"
				:class="$style.restoreButton"
				data-test-id="version-restore-button"
				@click="handleRestore"
			/>
		</div>
	</BaseMessage>
</template>

<style lang="scss" module>
.versionCard {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: var(--radius);
	background-color: var(--color--foreground--tint-1);
}

.historyIcon {
	color: var(--color--text--tint-1);
}

.content {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	gap: var(--spacing--5xs);
}

.timestamp {
	font-size: var(--font-size--sm);
	color: var(--color--text);
}

.restoreButton {
	flex-shrink: 0;
}
</style>
