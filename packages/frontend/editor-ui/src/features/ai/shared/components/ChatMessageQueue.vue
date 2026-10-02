<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue';
import Draggable from 'vuedraggable';
import {
	N8nAiActivityStepButton,
	N8nAiActivityStepChevron,
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentChatQueueItem } from '@n8n/api-types';

interface QueueEdit {
	item: AgentChatQueueItem;
	text: string;
	unavailable: boolean;
	saving: boolean;
}

const props = defineProps<{
	items: AgentChatQueueItem[];
	displayedItems: AgentChatQueueItem[];
	visibleItems: AgentChatQueueItem[];
	expanded: boolean;
	isReordering: boolean;
	queueEdit?: QueueEdit;
	canSaveQueueEdit: boolean;
	canSteer: boolean;
	canDragQueueItem: (index: number) => boolean;
	isQueueItemBusy: (item: AgentChatQueueItem) => boolean;
	canDropQueueItem: (event: { draggedContext: { index: number; futureIndex: number } }) => boolean;
}>();

const emit = defineEmits<{
	'update:expanded': [value: boolean];
	'drag-start': [];
	'drag-end': [event: { oldIndex?: number; newIndex?: number }];
	'handle-keydown': [event: KeyboardEvent, index: number];
	'edit-keydown': [event: KeyboardEvent];
	save: [];
	cancelEdit: [];
	steer: [id: string];
	edit: [item: AgentChatQueueItem];
	remove: [id: string];
}>();

const locale = useI18n();
const queueListId = useId();
const queueElement = useTemplateRef<HTMLDivElement>('messageQueue');
const expanded = computed({
	get: () => props.expanded,
	set: (value: boolean) => emit('update:expanded', value),
});

function focusItem(id: string) {
	queueElement.value
		?.querySelector<HTMLButtonElement>(
			`[data-queue-id="${id}"] [data-testid="agent-queue-drag-handle"]:not(:disabled)`,
		)
		?.focus();
}

defineExpose({ focusItem });
</script>

<template>
	<div ref="messageQueue" :class="$style.messageQueue" data-testid="agent-message-queue">
		<Draggable
			:id="queueListId"
			:model-value="visibleItems"
			item-key="id"
			tag="ul"
			:class="[$style.backgroundJobList, $style.queueList]"
			:handle="`.${$style.queueDragHandle}:not(:disabled)`"
			:disabled="!!queueEdit || isReordering"
			:move="canDropQueueItem"
			:ghost-class="$style.queueGhost"
			:drag-class="$style.queueDragging"
			@start="emit('drag-start')"
			@end="emit('drag-end', $event)"
		>
			<template #item="{ element: item, index }">
				<li :data-queue-id="item.id" data-testid="agent-queued-message">
					<N8nTooltip
						:content="locale.baseText('agents.chat.queue.reorderTooltip')"
						:disabled="!canDragQueueItem(index)"
						placement="top"
					>
						<N8nButton
							icon-only
							variant="ghost"
							size="xsmall"
							:class="$style.queueDragHandle"
							:disabled="!canDragQueueItem(index)"
							:aria-label="
								locale.baseText('agents.chat.queue.reorder', {
									interpolate: { position: index + 1, count: displayedItems.length },
								})
							"
							aria-keyshortcuts="ArrowUp ArrowDown"
							data-testid="agent-queue-drag-handle"
							@keydown="emit('handle-keydown', $event, index)"
						>
							<template #icon>
								<N8nIcon icon="grip-vertical" size="large" aria-hidden="true" />
							</template>
						</N8nButton>
					</N8nTooltip>
					<div :class="$style.queuePreview" :title="item.message">
						<N8nInput
							v-if="queueEdit && queueEdit.item.id === item.id"
							:model-value="queueEdit.text"
							type="textarea"
							size="small"
							:autosize="{ minRows: 1, maxRows: 6 }"
							:readonly="queueEdit.unavailable || queueEdit.saving"
							:aria-label="locale.baseText('agents.chat.queue.edit')"
							autofocus
							@update:model-value="queueEdit.text = $event"
							@keydown="emit('edit-keydown', $event)"
						/>
						<N8nText v-else-if="item.message" bold step="xs" color="text-light">{{
							item.message
						}}</N8nText>
						<N8nText
							v-if="queueEdit && queueEdit.item.id === item.id && queueEdit.unavailable"
							:class="$style.queueEditNotice"
							role="status"
							bold
							step="xs"
							color="text-light"
						>
							{{
								locale.baseText(
									item.steeringExecutionId && items.includes(item)
										? 'agents.chat.queue.editSteeringUnavailable'
										: 'agents.chat.queue.editUnavailable',
								)
							}}
						</N8nText>
						<N8nText
							v-else-if="item.steeringExecutionId"
							:class="$style.queueEditNotice"
							role="status"
							bold
							step="xs"
							color="text-light"
						>
							{{ locale.baseText('agents.chat.queue.steering') }}
						</N8nText>
						<span v-for="attachment in item.attachments" :key="attachment.id">{{
							attachment.fileName
						}}</span>
					</div>
					<div :class="$style.queueActions">
						<template v-if="queueEdit && queueEdit.item.id === item.id">
							<N8nTooltip
								:content="locale.baseText('agents.chat.queue.save')"
								:disabled="!canSaveQueueEdit"
								placement="top"
							>
								<N8nButton
									icon-only
									variant="ghost"
									size="xsmall"
									:disabled="!canSaveQueueEdit"
									:aria-label="locale.baseText('agents.chat.queue.save')"
									@click="emit('save')"
								>
									<template #icon
										><N8nIcon icon="check" size="large" aria-hidden="true"
									/></template>
								</N8nButton>
							</N8nTooltip>
							<N8nTooltip
								:content="locale.baseText('agents.chat.queue.cancelEdit')"
								:disabled="queueEdit.saving"
								placement="top"
							>
								<N8nButton
									icon-only
									variant="ghost"
									size="xsmall"
									:disabled="queueEdit.saving"
									:aria-label="locale.baseText('agents.chat.queue.cancelEdit')"
									@click="emit('cancelEdit')"
								>
									<template #icon><N8nIcon icon="x" size="large" aria-hidden="true" /></template>
								</N8nButton>
							</N8nTooltip>
						</template>
						<template v-else>
							<N8nTooltip
								:content="locale.baseText('agents.chat.queue.steerTooltip')"
								:disabled="!canSteer || !!queueEdit || isQueueItemBusy(item)"
								placement="top"
							>
								<N8nButton
									variant="ghost"
									size="xsmall"
									:disabled="!canSteer || !!queueEdit || isQueueItemBusy(item)"
									:aria-label="locale.baseText('agents.chat.queue.steer')"
									@click="emit('steer', item.id)"
								>
									<template #icon
										><N8nIcon icon="corner-down-right" size="large" aria-hidden="true"
									/></template>
									{{ locale.baseText('agents.chat.queue.steer') }}
								</N8nButton>
							</N8nTooltip>
							<N8nTooltip
								:content="locale.baseText('agents.chat.queue.edit')"
								:disabled="!!queueEdit || isQueueItemBusy(item)"
								placement="top"
							>
								<N8nIconButton
									icon="pencil"
									variant="ghost"
									size="xsmall"
									icon-size="medium"
									:disabled="!!queueEdit || isQueueItemBusy(item)"
									:aria-label="locale.baseText('agents.chat.queue.edit')"
									@click="emit('edit', item)"
								/>
							</N8nTooltip>
							<N8nTooltip
								:content="locale.baseText('agents.chat.queue.remove')"
								:disabled="isQueueItemBusy(item)"
								placement="top"
							>
								<N8nIconButton
									icon="trash-2"
									variant="ghost"
									size="xsmall"
									icon-size="medium"
									:disabled="isQueueItemBusy(item)"
									:aria-label="locale.baseText('agents.chat.queue.remove')"
									@click="emit('remove', item.id)"
								/>
							</N8nTooltip>
						</template>
					</div>
				</li>
			</template>
		</Draggable>
		<N8nAiActivityStepButton
			v-if="displayedItems.length > 2"
			:aria-expanded="expanded"
			:aria-controls="queueListId"
			:disabled="isReordering"
			full-width
			@click="expanded = !expanded"
		>
			{{
				items.length > 2
					? locale.baseText('agents.chat.queue.title', {
							adjustToNumber: items.length - 2,
							interpolate: { count: items.length - 2 },
						})
					: locale.baseText('agents.chat.queue.edit')
			}}
			<template #suffix><N8nAiActivityStepChevron :open="expanded" direction="down" /></template>
		</N8nAiActivityStepButton>
	</div>
</template>

<style lang="scss" module>
.messageQueue {
	min-width: 0;
	--ai-activity-step--height: auto;
	--ai-activity-step--min-height: var(--height--xl);
	--ai-activity-step--padding: var(--spacing--xs) var(--spacing--sm);
	--ai-activity-step--color: var(--text-color);
	--text-color: light-dark(var(--color--neutral-600), var(--text-color--subtler));
	--icon-color: var(--color--neutral-400);

	margin-inline: var(--spacing--xs);
	transform: translateY(var(--spacing--sm));
	padding-bottom: var(--spacing--sm);
	background: var(--background--subtle);
	border-radius: var(--radius--xl) var(--radius--xl) 0 0;
	border: var(--border);
	border-bottom: 0;
	background-clip: padding-box;

	display: flex;
	flex-direction: column;
}

.messageQueue :global(.n8n-icon) {
	color: var(--icon-color);
}

.backgroundJobList {
	list-style: none;
	margin: 0;
	padding: 0;
	width: 100%;
	overflow-y: auto;
}

.backgroundJobList li {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-inline: var(--spacing--2xs);
	gap: var(--spacing--2xs);
	height: var(--height--lg);
	font-size: var(--font-size--sm);
	color: var(--text-color--subtle);
	overflow-wrap: anywhere;
	line-height: var(--line-height--lg);
}

.messageQueue :global(button[aria-expanded]),
.queueList > li {
	font-size: var(--font-size--2xs);
}

.messageQueue > .queueList:not(:last-child) {
	padding-bottom: 0;
}

.queueActions {
	display: flex;
	align-self: center;
	flex-shrink: 0;
}

.queueDragHandle {
	flex-shrink: 0;
	cursor: grab;
	touch-action: none;

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

.queueEditNotice {
	margin: var(--spacing--3xs) 0;
	font-size: var(--font-size--2xs);
}

.queuePreview {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}
</style>
