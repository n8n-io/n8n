<script lang="ts" setup>
import { nextTick, ref, watch } from 'vue';
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuPortal,
	ContextMenuRoot,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from 'reka-ui';

import { N8nIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/src/components/N8nIcon/icons';
import { useStyles } from '@/app/composables/useStyles';

export interface ProjectCanvasMenuItem {
	id: string;
	label: string;
	icon?: IconName;
	divided?: boolean;
	disabled?: boolean;
}

const props = defineProps<{
	isOpen: boolean;
	position: [number, number];
	items: ProjectCanvasMenuItem[];
}>();

const emit = defineEmits<{ select: [id: string]; close: [] }>();

const trigger = ref<HTMLElement>();
const { APP_Z_INDEXES } = useStyles();

// Reka's context menu opens from a real `contextmenu` event on its trigger; replay the
// captured canvas position onto an invisible fixed trigger element.
watch(
	() => props.isOpen,
	(open) => {
		if (!open) return;
		void nextTick(() => {
			const [clientX, clientY] = props.position;
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

function onOpenChange(open: boolean) {
	if (!open) emit('close');
}
</script>

<template>
	<Teleport v-if="props.isOpen" to="body">
		<ContextMenuRoot :modal="false" @update:open="onOpenChange">
			<ContextMenuTrigger as-child>
				<div
					ref="trigger"
					:class="$style.trigger"
					:style="{
						left: `${props.position[0]}px`,
						top: `${props.position[1]}px`,
						zIndex: APP_Z_INDEXES.CONTEXT_MENU,
					}"
				/>
			</ContextMenuTrigger>
			<ContextMenuPortal>
				<ContextMenuContent
					:class="$style.content"
					data-test-id="project-canvas-context-menu"
					:style="{ zIndex: APP_Z_INDEXES.CONTEXT_MENU }"
				>
					<template v-for="item in props.items" :key="item.id">
						<ContextMenuSeparator v-if="item.divided" :class="$style.separator" />
						<ContextMenuItem
							:class="[$style.item, { [$style.disabled]: !!item.disabled }]"
							:disabled="item.disabled"
							:data-test-id="`project-canvas-context-menu-item-${item.id}`"
							@select="emit('select', item.id)"
						>
							<span v-if="item.icon" :class="$style.icon">
								<N8nIcon :icon="item.icon" size="medium" />
							</span>
							<span :class="$style.label">{{ item.label }}</span>
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
	display: flex;
	flex-direction: column;
	width: fit-content;
	min-width: 10rem;
	max-width: 24rem;
	max-height: var(--reka-context-menu-content-available-height);
	overflow-y: auto;
	border-radius: var(--radius--xs);
	background-color: var(--background--surface, var(--color--background--light-3));
	--shadow-color--outline: var(--border-color);
	box-shadow:
		var(--shadow--md),
		inset var(--shadow--outline);
	will-change: transform, opacity;
	scrollbar-width: none;

	&[data-state='open'] {
		animation-duration: var(--duration--snappy);
		animation-timing-function: var(--easing--ease-out);
		animation-name: projectCanvasContextMenuIn;
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
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);

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

.disabled {
	opacity: 0.5;
}

.separator {
	height: var(--border-width);
	background-color: var(--border-color);
	margin: var(--spacing--3xs) var(--spacing--2xs);
}

@keyframes projectCanvasContextMenuIn {
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
