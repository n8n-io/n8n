<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { useI18n } from '@n8n/i18n';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import type { AgentJsonConfig } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText, N8nMarkdown, N8nTooltip } from '@n8n/design-system';
import type { TimelineItem } from '../../session-timeline.types';
import AgentPersonalisationIcon from '../AgentPersonalisationIcon.vue';

interface MessageItem {
	item: TimelineItem;
	senderName: string;
	messageMarkdown: string;
	personalisation?: AgentJsonConfig['personalisation'] | null;
}

const COLLAPSED_MAX_HEIGHT = 256;

const props = defineProps<MessageItem>();
const i18n = useI18n();
const expanded = ref(false);
const isCollapsible = ref(false);
const messageContent = useTemplateRef<HTMLElement>('messageContent');
const expandButtonLabel = computed(() =>
	i18n.baseText(expanded.value ? 'generic.collapse' : 'generic.expand'),
);

function measureContent() {
	isCollapsible.value =
		(messageContent.value?.getBoundingClientRect().height ?? 0) > COLLAPSED_MAX_HEIGHT;
}

useResizeObserver(messageContent, measureContent);
watch(() => props.messageMarkdown, measureContent, { flush: 'post' });
watch(
	() => props.item,
	() => {
		expanded.value = false;
	},
);

const time = computed(function getTime(): string {
	if (!props.item.timestamp) return '';
	return convertToDisplayDate(new Date(props.item.timestamp).toISOString()).time;
});
</script>

<template>
	<section :class="$style.panelContainer">
		<div :class="$style.panelHeader">
			<div :class="$style.panelHeaderIdentity">
				<div v-if="props.item.kind === 'user'" :class="$style.iconContainer">
					<N8nIcon icon="user" size="medium" />
				</div>
				<AgentPersonalisationIcon v-else :personalisation="props.personalisation" :size="20" />
				<N8nText step="sm" bold>{{ props.senderName }}</N8nText>
			</div>
			<N8nText step="xs" color="text-light" bold>{{ time }}</N8nText>
		</div>
		<CollapsibleRoot
			v-model:open="expanded"
			:class="[$style.panelContent, { [$style.isCollapsed]: isCollapsible && !expanded }]"
		>
			<CollapsibleContent
				force-mount
				:class="$style.messageViewport"
				:style="{ maxHeight: isCollapsible && !expanded ? `${COLLAPSED_MAX_HEIGHT}px` : undefined }"
			>
				<div ref="messageContent" :class="$style.messageContent">
					<N8nMarkdown :content="props.messageMarkdown" />
				</div>
			</CollapsibleContent>
			<div v-if="isCollapsible" :class="$style.expandButtonContainer">
				<N8nTooltip :content="expandButtonLabel">
					<CollapsibleTrigger as-child>
						<N8nButton
							size="small"
							:icon="expanded ? 'arrow-up' : 'arrow-down'"
							icon-only
							icon-size="medium"
							variant="subtle"
							:class="$style.expandButton"
							:aria-label="expandButtonLabel"
						/>
					</CollapsibleTrigger>
				</N8nTooltip>
			</div>
		</CollapsibleRoot>
	</section>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/mixins';

.panelContainer {
	width: 100%;
	display: flex;
	flex-direction: column;
	background-color: var(--background--surface);
	border-radius: var(--radius--lg);
	border: var(--border);
	box-shadow: var(--shadow--xs);
}
.panelHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm);
	border-bottom: var(--border);
	border-color: var(--border-color--subtle);
}
.panelHeaderIdentity {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);

	.iconContainer {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--height--2xs);
		height: var(--height--2xs);
		flex-shrink: 0;
		border-radius: var(--radius);
	}

	> span {
		line-height: 1;
	}
}
.panelContent {
	position: relative;
	padding: var(--spacing--sm);

	&.isCollapsed {
		@include mixins.scroll-mask(bottom);
		padding-block-end: 0;
	}
}
.messageViewport {
	overflow: hidden;
}
.messageContent {
	display: flow-root;
}
.expandButtonContainer {
	display: grid;
	place-items: center;
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: var(--spacing--xs);
	pointer-events: none;
}
.expandButton {
	opacity: 0;
	pointer-events: auto;
}
.panelContent[data-state='closed'] .expandButton,
.panelContent:hover .expandButton,
.panelContent:focus-within .expandButton {
	opacity: 1;
}
</style>
