<script lang="ts" setup>
import { useContextMenu } from '../composables/useContextMenu';
import { type ContextMenuAction } from '../composables/useContextMenuItems';
import { useStyles } from '@/app/composables/useStyles';
import { nextTick, ref, watch } from 'vue';
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuPortal,
	ContextMenuRoot,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from 'reka-ui';

import { N8nIcon, N8nKeyboardShortcut } from '@n8n/design-system';

const contextMenu = useContextMenu();
const { position, isOpen, actions } = contextMenu;
const trigger = ref<HTMLElement>();
const emit = defineEmits<{ action: [action: ContextMenuAction, nodeIds: string[]] }>();
const { APP_Z_INDEXES } = useStyles();

watch(
	isOpen,
	(open) => {
		if (!open) return;

		void nextTick(() => {
			const [clientX, clientY] = position.value;
			trigger.value?.dispatchEvent(
				new PointerEvent('contextmenu', {
					bubbles: true,
					cancelable: true,
					button: 2,
					clientX,
					clientY,
				}),
			);
		});
	},
	{ flush: 'post' },
);

function onActionSelect(item: ContextMenuAction) {
	emit('action', item, contextMenu.targetNodeIds.value);
}

function onOpenChange(open: boolean) {
	if (!open) {
		contextMenu.close();
	}
}
</script>

<template>
	<Teleport v-if="isOpen" to="body">
		<ContextMenuRoot :modal="false" @update:open="onOpenChange">
			<ContextMenuTrigger as-child>
				<div
					ref="trigger"
					:class="$style.trigger"
					:style="{
						left: `${position[0]}px`,
						top: `${position[1]}px`,
						zIndex: APP_Z_INDEXES.CONTEXT_MENU,
					}"
				/>
			</ContextMenuTrigger>
			<ContextMenuPortal>
				<ContextMenuContent
					:class="$style.content"
					data-test-id="context-menu"
					:style="{ zIndex: APP_Z_INDEXES.CONTEXT_MENU }"
				>
					<template v-for="item in actions" :key="item.id">
						<ContextMenuSeparator v-if="item.divided" :class="$style.separator" />
						<ContextMenuItem
							:class="[$style.item, $style.itemContainer, { [$style.disabled]: !!item.disabled }]"
							:disabled="item.disabled"
							:data-test-id="`context-menu-item-${item.id}`"
							@select="onActionSelect(item.id)"
						>
							<span v-if="item.icon" :class="$style.icon">
								<N8nIcon :icon="item.icon" size="medium" />
							</span>
							<span :class="$style.label">{{ item.label }}</span>
							<N8nKeyboardShortcut
								v-if="item.shortcut"
								v-bind="item.shortcut"
								:class="$style.shortcut"
							/>
						</ContextMenuItem>
					</template>
				</ContextMenuContent>
			</ContextMenuPortal>
		</ContextMenuRoot>
	</Teleport>
</template>

<style module lang="scss">
.trigger {
	position: fixed;
	width: 1px;
	height: 1px;
	pointer-events: none;
	opacity: 0;
}

.content {
	--n8n--dropdown--offset--slide-x: 0;
	--n8n--dropdown--offset--slide-y: 0;
	--n8n--dropdown--offset--origin-x: left;
	--n8n--dropdown--offset--origin-y: top;
	--n8n--dropdown-menu-width: 24rem;

	display: flex;
	flex-direction: column;
	width: fit-content;
	min-width: calc(var(--n8n--dropdown-menu-width) / 4);
	max-width: var(--n8n--dropdown-menu-width);
	max-height: var(--reka-context-menu-content-available-height);
	overflow-y: auto;
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	--shadow-color--outline: var(--border-color);
	box-shadow:
		var(--shadow--md),
		inset var(--shadow--outline);
	will-change: transform, opacity;
	transform-origin: var(--n8n--dropdown--offset--origin-x) var(--n8n--dropdown--offset--origin-y);
	scrollbar-width: none;

	&[data-state='open'] {
		animation-duration: var(--duration--snappy);
		animation-timing-function: var(--easing--ease-out);
		animation-name: contextMenuIn;
	}
}

.item {
	display: flex;
	align-items: center;
	height: var(--spacing--xl);
	padding: var(--spacing--2xs);
	position: relative;
	user-select: none;
	gap: var(--spacing--2xs);
	outline: none;
	color: var(--text-color);

	&:not([data-disabled]) {
		&:hover,
		&[data-highlighted] {
			background-color: var(--background--hover);
			cursor: pointer;
		}
	}

	&[data-disabled] {
		color: var(--text-color--disabled);
		cursor: not-allowed;
	}
}

.itemContainer {
	font-size: var(--font-size--2xs);
	line-height: var(--font-line-height-regular);
	font-weight: var(--font-weight--regular);
}

.icon {
	display: flex;
	justify-content: center;
	align-items: center;
	width: var(--spacing--xs);
	margin-right: var(--spacing--2xs);
	flex-grow: 0;
	flex-shrink: 0;
}

.label {
	flex-grow: 1;
	white-space: nowrap;
}

.shortcut {
	margin-left: var(--spacing--xl);
}

.disabled {
	opacity: 0.5;
}

.separator {
	height: var(--border-width);
	background-color: var(--border-color);
	margin: var(--spacing--3xs) var(--spacing--2xs);
}

@keyframes contextMenuIn {
	from {
		opacity: 0;
		transform: translate(0, 2px) scale(0.96);
	}
	to {
		opacity: 1;
		transform: translate(0, 0) scale(1);
	}
}
</style>
