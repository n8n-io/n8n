<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue';
import Draggable from 'vuedraggable';
import {
	N8nButton,
	N8nHoverCard,
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

function getQueueNotice(item: AgentChatQueueItem) {
	if (props.queueEdit?.item.id === item.id && props.queueEdit.unavailable) {
		return locale.baseText(
			item.steeringExecutionId && props.items.includes(item)
				? 'agents.chat.queue.editSteeringUnavailable'
				: 'agents.chat.queue.editUnavailable',
		);
	}

	if (item.steeringExecutionId) {
		return locale.baseText('agents.chat.queue.steering');
	}

	return undefined;
}

function getAttachmentFileNames(item: AgentChatQueueItem) {
	return item.attachments?.map((attachment) => attachment.fileName).join(', ');
}

defineExpose({ focusItem });
</script>

<template>
	<div ref="messageQueue" :class="$style.messageQueue" data-testid="agent-message-queue">
		<button
			v-if="displayedItems.length > 1"
			type="button"
			:class="[$style.queueToggle, { [$style.queueToggleExpanded]: expanded }]"
			:aria-expanded="expanded"
			:aria-label="
				locale.baseText('agents.chat.queue.title', {
					adjustToNumber: displayedItems.length,
					interpolate: { count: displayedItems.length },
				})
			"
			:aria-controls="queueListId"
			:disabled="isReordering"
			@click="expanded = !expanded"
		>
			<N8nIcon icon="list-end" size="medium" color="text-light" aria-hidden="true" />
			<N8nText bold step="xs" color="text-light">
				{{
					locale.baseText('agents.chat.queue.title', {
						adjustToNumber: displayedItems.length,
						interpolate: { count: displayedItems.length },
					})
				}}
			</N8nText>
			<N8nIcon
				:icon="expanded ? 'chevron-up' : 'chevron-down'"
				:class="$style.queueToggleChevron"
				size="small"
				aria-hidden="true"
			/>
		</button>
		<div
			:class="[
				$style.queueContent,
				{ [$style.queueContentOpen]: expanded || displayedItems.length === 1 },
			]"
			:inert="!expanded && displayedItems.length > 1"
		>
			<Draggable
				:id="queueListId"
				:model-value="displayedItems"
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
							<N8nIconButton
								icon="grip-vertical"
								variant="ghost"
								icon-size="medium"
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
							/>
						</N8nTooltip>
						<div :class="$style.queuePreview" :title="item.message">
							<N8nInput
								v-if="queueEdit && queueEdit.item.id === item.id"
								:model-value="queueEdit.text"
								type="textarea"
								size="small"
								:autosize="{ minRows: 1, maxRows: 6 }"
								:readonly="queueEdit.unavailable || queueEdit.saving"
								:aria-label="locale.baseText('generic.edit')"
								autofocus
								@update:model-value="queueEdit.text = $event"
								@keydown="emit('edit-keydown', $event)"
							/>
							<N8nText v-else-if="item.message" bold step="xs" color="text-light">{{
								item.message
							}}</N8nText>
						</div>
						<N8nHoverCard v-if="item.attachments?.length" side="top">
							<template #trigger>
								<span
									:class="$style.queueIndicator"
									:aria-label="getAttachmentFileNames(item)"
									role="img"
									tabindex="0"
								>
									<N8nIcon icon="paperclip" size="medium" />
								</span>
							</template>
							<template #content>
								<ul :class="$style.queueAttachmentList">
									<li v-for="attachment in item.attachments" :key="attachment.id">
										<N8nText size="small">{{ attachment.fileName }}</N8nText>
									</li>
								</ul>
							</template>
						</N8nHoverCard>
						<N8nTooltip
							:content="getQueueNotice(item)"
							:disabled="!getQueueNotice(item)"
							placement="top"
							as-child
						>
							<div
								:class="[
									$style.queueActions,
									{ [$style.queueActionsWithNotice]: getQueueNotice(item) },
								]"
								:aria-label="getQueueNotice(item)"
								:tabindex="getQueueNotice(item) ? 0 : undefined"
								role="group"
							>
								<N8nButton
									v-if="getQueueNotice(item)"
									variant="ghost"
									size="xsmall"
									disabled
									:aria-label="locale.baseText('agents.chat.queue.steer')"
								>
									<template #icon>
										<N8nIcon icon="corner-down-right" size="large" aria-hidden="true" />
									</template>
									{{ locale.baseText('agents.chat.queue.steer') }}
								</N8nButton>
								<template v-if="queueEdit && queueEdit.item.id === item.id">
									<N8nTooltip
										:content="locale.baseText('generic.save')"
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
										:content="locale.baseText('generic.cancel')"
										:disabled="!!getQueueNotice(item) || queueEdit.saving"
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
											<template #icon
												><N8nIcon icon="x" size="large" aria-hidden="true"
											/></template>
										</N8nButton>
									</N8nTooltip>
								</template>
								<template v-else>
									<N8nTooltip
										v-if="!getQueueNotice(item)"
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
										:content="locale.baseText('generic.edit')"
										:disabled="!!queueEdit || isQueueItemBusy(item)"
										placement="top"
									>
										<N8nIconButton
											icon="pencil"
											variant="ghost"
											size="xsmall"
											icon-size="medium"
											:disabled="!!queueEdit || isQueueItemBusy(item)"
											:aria-label="locale.baseText('generic.edit')"
											@click="emit('edit', item)"
										/>
									</N8nTooltip>
									<N8nTooltip
										:content="locale.baseText('generic.delete')"
										:disabled="isQueueItemBusy(item)"
										placement="top"
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
								</template>
							</div>
						</N8nTooltip>
					</li>
				</template>
			</Draggable>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';
@use '@n8n/design-system/css/mixins/utils';
@use '@n8n/design-system/css/mixins/mixins';

.messageQueue {
	--n8n--message-queue--radius: var(--radius--xl) var(--radius--xl) 0 0;
	--n8n--message--queue--y-offset: var(--spacing--sm);

	display: flex;
	flex-direction: column;
	min-width: 0;
	margin-inline: var(--spacing--xs);
	transform: translateY(var(--n8n--message--queue--y-offset));
	padding-bottom: var(--spacing--sm);
	background: var(--background--subtle);
	border-radius: var(--n8n--message-queue--radius);
	border: var(--border);
	border-bottom: 0;
	background-clip: padding-box;
	transition: transform var(--duration--snappy) var(--easing--ease-out);

	&:hover:not(:has(.queueContentOpen)) {
		transform: translateY(calc(var(--n8n--message--queue--y-offset) - var(--spacing--3xs)));
		background-color: color-mix(
			in srgb,
			var(--background--subtle),
			light-dark(var(--color--neutral-black), var(--color--neutral-white)) 2%
		);
	}
}

.backgroundJobList {
	list-style: none;
	margin: 0;
	padding: 0;
	min-height: 0;
	overflow-x: hidden;
	overflow-y: scroll;
	max-height: 180px;
	scrollbar-gutter: stable;
	@include mixins.hoverable-scroll-bar;
	@include mixins.scroll-mask(bottom);
}

.backgroundJobList li {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	padding-inline: var(--spacing--xs);
	gap: var(--spacing--2xs);
	height: var(--height--lg);
	font-size: var(--font-size--sm);
	color: var(--text-color--subtle);
	overflow-wrap: anywhere;
	line-height: var(--line-height--lg);
}

.queueContent {
	display: grid;
	width: 100%;
	grid-template-rows: 0fr;
	transition: grid-template-rows var(--duration--snappy) var(--easing--ease-out);
	overflow: hidden;
	@include motion.reduced-motion;
}

.queueContentOpen {
	grid-template-rows: 1fr;
}
.queueToggle {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: var(--spacing--xs);
	width: 100%;
	height: var(--height--lg);
	padding: var(--spacing--xs);
	border: 0;
	background: transparent;
	border-radius: var(--n8n--message-queue--radius);
	font: inherit;
	cursor: pointer;

	&:not(.queueToggleExpanded) > :global(.n8n-text) {
		--animation--shimmer--duration: var(--duration--slowest);
		--animation--shimmer--foreground: var(--text-color--subtle);
		--animation--shimmer--background: var(--text-color--subtler);

		@include motion.shimmer;
	}

	> :last-child {
		flex-shrink: 0;
		margin-inline-end: var(--spacing--3xs);
	}

	&:disabled {
		cursor: default;
	}

	&:focus-visible {
		outline: var(--border);
		outline-offset: calc(-1 * var(--spacing--5xs));
	}
}
.queueToggleChevron {
	margin-inline-start: auto;
}

.queueToggleExpanded {
	border-bottom: var(--border);
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
