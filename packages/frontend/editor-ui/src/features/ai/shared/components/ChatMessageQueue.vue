<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import Draggable from 'vuedraggable';
import ChatCollapsibleContainer from './ChatCollapsibleContainer.vue';
import {
	N8nButton,
	N8nHoverCard,
	N8nIcon,
	N8nIconButton,
	N8nScrollArea,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ChatMessageQueueSteerAction, ChatMessageQueueItem } from './chatMessageQueue.types';

const props = defineProps<{
	displayedItems: ChatMessageQueueItem[];
	expanded: boolean;
	isReordering: boolean;
	canEdit: boolean;
	steerAction?: ChatMessageQueueSteerAction;
	canSteer?: boolean;
	canDragQueueItem: (index: number) => boolean;
	isQueueItemBusy: (item: ChatMessageQueueItem) => boolean;
	canDropQueueItem: (event: { draggedContext: { index: number; futureIndex: number } }) => boolean;
}>();

const emit = defineEmits<{
	'update:expanded': [value: boolean];
	'drag-start': [];
	'drag-end': [event: { oldIndex?: number; newIndex?: number }];
	steer: [id: string];
	edit: [id: string];
	remove: [id: string];
}>();

const locale = useI18n();
const expanded = computed({
	get: () => props.expanded,
	set: (value: boolean) => emit('update:expanded', value),
});

let keyboardHandle: HTMLButtonElement | undefined;

function onQueueHandleKeydown(event: KeyboardEvent, index: number) {
	if (props.isReordering || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
	event.preventDefault();
	event.stopPropagation();
	const futureIndex = index + (event.key === 'ArrowUp' ? -1 : 1);
	if (
		!props.canDragQueueItem(index) ||
		!props.displayedItems[futureIndex] ||
		!props.canDropQueueItem({ draggedContext: { index, futureIndex } })
	) {
		return;
	}

	if (event.currentTarget instanceof HTMLButtonElement) {
		keyboardHandle = event.currentTarget;
	}
	emit('drag-start');
	emit('drag-end', { oldIndex: index, newIndex: futureIndex });
}

watch(
	() => props.isReordering,
	async (isReordering) => {
		if (isReordering || !keyboardHandle) return;
		await nextTick();
		keyboardHandle?.focus();
		keyboardHandle = undefined;
	},
);
</script>

<template>
	<div :class="$style.messageQueueEntrance">
		<ChatCollapsibleContainer
			v-model:expanded="expanded"
			:collapsible="displayedItems.length > 1"
			:disabled="isReordering"
			:label="
				locale.baseText('chat.messageQueue.title', {
					adjustToNumber: displayedItems.length,
					interpolate: { count: displayedItems.length },
				})
			"
			:class="$style.messageQueue"
			data-testid="chat-message-queue"
		>
			<template #header>
				<N8nIcon icon="list-end" size="medium" color="text-light" aria-hidden="true" />
				<N8nText bold step="xs" :class="{ [$style.queueLabelPending]: !expanded }">
					{{
						locale.baseText('chat.messageQueue.title', {
							adjustToNumber: displayedItems.length,
							interpolate: { count: displayedItems.length },
						})
					}}
				</N8nText>
			</template>
			<N8nScrollArea
				as-child
				type="hover"
				max-height="calc(var(--height--lg) * 5)"
				:class="$style.queueScrollArea"
			>
				<Draggable
					:model-value="displayedItems"
					item-key="id"
					tag="ul"
					:class="[$style.backgroundJobList, $style.queueList]"
					:handle="`.${$style.queueDragHandle}:not(:disabled)`"
					:disabled="isReordering"
					:move="canDropQueueItem"
					:ghost-class="$style.queueGhost"
					:drag-class="$style.queueDragging"
					@start="emit('drag-start')"
					@end="emit('drag-end', $event)"
				>
					<template #item="{ element: item, index }">
						<li :data-queue-id="item.id" data-testid="chat-queued-message">
							<N8nTooltip
								v-if="displayedItems.length > 1"
								:content="locale.baseText('chat.messageQueue.reorderTooltip')"
								:disabled="!canDragQueueItem(index)"
								placement="top"
							>
								<N8nIconButton
									icon="grip-vertical"
									variant="ghost"
									icon-size="medium"
									size="xsmall"
									:class="$style.queueDragHandle"
									:disabled="!canDragQueueItem(index)"
									:aria-label="
										locale.baseText('chat.messageQueue.reorder', {
											interpolate: { position: index + 1, count: displayedItems.length },
										})
									"
									aria-keyshortcuts="ArrowUp ArrowDown"
									data-testid="chat-queue-drag-handle"
									@keydown="onQueueHandleKeydown($event, index)"
								/>
							</N8nTooltip>
							<N8nIcon
								v-else
								icon="list-end"
								size="medium"
								color="text-light"
								aria-hidden="true"
								:class="$style.queueIcon"
							/>
							<div :class="$style.queuePreview" :title="item.message">
								<N8nText v-if="item.message" bold step="xs" color="text-light">{{
									item.message
								}}</N8nText>
							</div>
							<N8nHoverCard v-if="item.attachmentNames?.length" side="top">
								<template #trigger>
									<span
										:class="$style.queueIndicator"
										:aria-label="item.attachmentNames?.join(', ')"
										role="img"
										tabindex="0"
									>
										<N8nIcon icon="paperclip" size="small" color="text-light" />
									</span>
								</template>
								<template #content>
									<ul :class="$style.queueAttachmentList">
										<li v-for="(fileName, index) in item.attachmentNames" :key="index">
											<N8nText size="small">{{ fileName }}</N8nText>
										</li>
									</ul>
								</template>
							</N8nHoverCard>
							<N8nTooltip :content="item.notice" :disabled="!item.notice" placement="top" as-child>
								<div
									:class="[$style.queueActions, { [$style.queueActionsWithNotice]: item.notice }]"
									:aria-label="item.notice"
									:tabindex="item.notice ? 0 : undefined"
									role="group"
								>
									<N8nTooltip
										v-if="steerAction && !item.notice"
										:content="steerAction.tooltip"
										:disabled="!canSteer || isQueueItemBusy(item)"
										placement="left"
									>
										<N8nButton
											variant="ghost"
											size="xsmall"
											:icon="steerAction.icon"
											icon-size="medium"
											:disabled="!canSteer || isQueueItemBusy(item)"
											:aria-label="steerAction.label"
											@click="emit('steer', item.id)"
										>
											{{ steerAction.label }}
										</N8nButton>
									</N8nTooltip>
									<N8nTooltip
										:content="locale.baseText('generic.edit')"
										:disabled="!canEdit || isQueueItemBusy(item)"
										placement="left"
									>
										<N8nIconButton
											icon="pencil"
											variant="ghost"
											size="xsmall"
											icon-size="medium"
											:disabled="!canEdit || isQueueItemBusy(item)"
											:aria-label="locale.baseText('generic.edit')"
											@click="emit('edit', item.id)"
										/>
									</N8nTooltip>
									<N8nTooltip
										:content="locale.baseText('generic.delete')"
										:disabled="isQueueItemBusy(item)"
										placement="left"
									>
										<N8nIconButton
											icon="trash-2"
											variant="ghost"
											size="xsmall"
											icon-size="medium"
											:disabled="isQueueItemBusy(item)"
											:aria-label="locale.baseText('generic.delete')"
											@click="emit('remove', item.id)"
										/>
									</N8nTooltip>
								</div>
							</N8nTooltip>
						</li>
					</template>
				</Draggable>
			</N8nScrollArea>
		</ChatCollapsibleContainer>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';
@use '@n8n/design-system/css/mixins/utils';
@use '@n8n/design-system/css/mixins/mixins';

.messageQueueEntrance {
	@include motion.fade-in-up;
}

.queueScrollArea {
	min-height: 0;
	height: auto;
	@include mixins.scroll-mask(bottom);
}

.backgroundJobList {
	list-style: none;
	margin: 0;
	padding: 0;
	padding-inline-end: var(--spacing--xs);
	min-height: 0;
}

.backgroundJobList li {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	padding-inline: var(--spacing--xs);
	/** This spacing accounts for extra width of drag handle button **/
	gap: var(--spacing--4xs);
	height: var(--height--lg);
	font-size: var(--font-size--sm);
	color: var(--text-color--subtle);
	overflow-wrap: anywhere;
	line-height: var(--line-height--lg);
}

.queueIcon {
	flex-shrink: 0;
}

.queueLabelPending {
	--animation--shimmer--duration: var(--duration--slowest);
	--animation--shimmer--foreground: var(--text-color--subtle);
	--animation--shimmer--background: var(--text-color--subtler);
	@include motion.shimmer;
}

.queueActions {
	margin-inline-start: auto;
	display: flex;
	align-self: center;
	flex-shrink: 0;
	margin-inline-end: calc(var(--spacing--xs) * -1);

	:global(.n8n-icon) {
		color: var(--icon-color);
	}
}

.queueDragHandle {
	flex-shrink: 0;
	cursor: grab;
	touch-action: none;
	margin-inline-start: calc(var(--spacing--3xs) * -1);
	color: var(--icon-color);

	&:active {
		cursor: grabbing;
	}
	&:disabled {
		cursor: default;
	}
}

.queueGhost {
	opacity: 0.4;
}
.queueDragging {
	background: var(--background--subtle);
	box-shadow: var(--shadow--sm);
	cursor: grabbing;
}

.queueActionsWithNotice :global(button:disabled) {
	pointer-events: none;
}

.queueIndicator {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
}

.queueAttachmentList {
	list-style: none;
	margin: 0;
	padding: var(--spacing--xs);
	overflow-wrap: anywhere;
}

.queuePreview {
	min-width: 0;
	display: flex;
	flex-direction: column;

	> :global(.n8n-text) {
		@include utils.utils-ellipsis;
	}
}
</style>
