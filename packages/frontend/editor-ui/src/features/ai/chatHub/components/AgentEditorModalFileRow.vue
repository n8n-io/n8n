<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ChatHubLLMProvider } from '@n8n/api-types';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';

export type FileRow = {
	id: string;
	name: string;
	mimeType: string;
	isNew: boolean;
	embeddingProvider: ChatHubLLMProvider | null;
	index: number;
};

const props = defineProps<{
	item: FileRow;
	semanticSearchReady: boolean;
	currentEmbeddingProvider: ChatHubLLMProvider | null;
}>();

const emit = defineEmits<{
	remove: [];
}>();

const i18n = useI18n();

const warningTooltip = computed<string | undefined>(() => {
	if (props.item.isNew) return undefined;
	if (!props.semanticSearchReady) {
		return i18n.baseText('chatHub.agent.editor.files.semanticSearchNotReady.tooltip');
	}
	if (
		props.item.embeddingProvider &&
		props.item.embeddingProvider !== props.currentEmbeddingProvider
	) {
		return i18n.baseText('chatHub.agent.editor.files.embeddingMismatch.tooltip', {
			interpolate: {
				fileProvider: providerDisplayNames[props.item.embeddingProvider],
				currentProvider: props.currentEmbeddingProvider
					? providerDisplayNames[props.currentEmbeddingProvider]
					: 'unknown',
			},
		});
	}
	return undefined;
});
</script>

<template>
	<div :class="$style.fileRow">
		<span :class="$style.fileName">{{ item.name }}</span>
		<div :class="$style.indexedCell">
			<N8nTooltip v-if="warningTooltip" :content="warningTooltip">
				<N8nIcon icon="triangle-alert" :class="$style.iconWarning" size="small" />
			</N8nTooltip>
			<N8nText v-else size="small" color="text-light">
				{{ item.isNew ? item.mimeType : i18n.baseText('chatHub.agent.editor.files.indexed') }}
			</N8nText>
		</div>
		<N8nIconButton icon="trash-2" size="small" variant="subtle" @click.stop="emit('remove')" />
	</div>
</template>

<style lang="scss" module>
.fileRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
	background-color: var(--color--background--light-2);

	&:last-child {
		border-bottom: none;
	}
}

.fileName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.indexedCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.iconWarning {
	color: var(--color--warning);
	flex-shrink: 0;
}
</style>
