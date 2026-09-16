<script setup lang="ts" generic="T extends ContextMenuId = ContextMenuId">
import { reactiveOmit } from '@vueuse/core';
import {
	ContextMenuContent,
	ContextMenuPortal,
	ContextMenuRoot,
	ContextMenuTrigger,
	injectContextMenuRootContext,
} from 'reka-ui';
import {
	computed,
	defineComponent,
	nextTick,
	provide,
	ref,
	shallowRef,
	useAttrs,
	useCssModule,
	watch,
} from 'vue';

import {
	contextMenuStateKey,
	type ContextMenuEmits,
	type ContextMenuId,
	type ContextMenuProps,
	type ContextMenuSlots,
	type ContextMenuState,
} from './ContextMenu.types';
import { applyCheckboxToggle, applyRadioSelection, findRadioGroup } from './ContextMenu.utils';
import ContextMenuBody from './ContextMenuBody.vue';

defineOptions({ name: 'N8nContextMenu', inheritAttrs: false });

const props = withDefaults(defineProps<ContextMenuProps<T>>(), {
	disabled: false,
	loading: false,
	loadingItemCount: 3,
	modal: true,
	open: undefined,
	defaultOpen: false,
});

const emit = defineEmits<ContextMenuEmits<T>>();
const slots = defineSlots<ContextMenuSlots<T>>();
const attrs = useAttrs();
const $style = useCssModule();

const triggerClass = computed(() => attrs.class);
const triggerAttrs = computed(() => reactiveOmit(attrs, ['class']));

/** Pixel value of `--spacing--2xs`. Reka `collisionPadding` is a number. */
const COLLISION_PADDING_PX = 8;

const ORIGIN: [number, number] = [0, 0];

const internalOpen = ref(props.open ?? props.defaultOpen);
const internalSelected = shallowRef<T[]>(props.defaultSelectedValues ?? []);
const triggerHostRef = ref<HTMLElement | null>(null);
const rekaHandleRef = ref<{ dismiss: () => void } | null>(null);

const selectedValues = computed(() => props.selectedValues ?? internalSelected.value);

/** Child of ContextMenuRoot so we can close Reka's own open state. */
const ContextMenuRekaHandle = defineComponent({
	name: 'ContextMenuRekaHandle',
	setup(_, { expose }) {
		const root = injectContextMenuRootContext();
		expose({
			dismiss: () => {
				root.onOpenChange(false);
			},
		});
		return () => null;
	},
});

function isRekaOpen() {
	return triggerHostRef.value?.getAttribute('data-state') === 'open';
}

function triggerOrigin(): [number, number] {
	const el = triggerHostRef.value;
	if (!el) return ORIGIN;
	const { left, top } = el.getBoundingClientRect();
	return [left, top];
}

/** Viewport point for a programmatic open. Right-click uses the pointer instead. */
function resolvePosition(): [number, number] {
	if (slots.trigger) {
		const [x, y] = triggerOrigin();
		const [dx, dy] = props.position ?? ORIGIN;
		return [x + dx, y + dy];
	}

	return props.position ?? ORIGIN;
}

function dispatchContextMenu() {
	const point = resolvePosition();
	triggerHostRef.value?.dispatchEvent(
		new PointerEvent('contextmenu', {
			bubbles: true,
			cancelable: true,
			button: 2,
			clientX: point[0],
			clientY: point[1],
		}),
	);
}

function syncReka(open: boolean) {
	if (open) {
		if (props.disabled || isRekaOpen()) return;
		dispatchContextMenu();
		return;
	}
	if (isRekaOpen()) {
		rekaHandleRef.value?.dismiss();
	}
}

function setOpen(open: boolean) {
	internalOpen.value = open;
	emit('update:open', open);
}

function setSelected(next: T[]) {
	internalSelected.value = next;
	emit('update:selectedValues', next);
}

function onSelect(id: T, keepOpen?: boolean) {
	emit('select', id);
	if (!keepOpen) {
		setOpen(false);
	}
}

function onToggleCheckbox(id: T) {
	setSelected(applyCheckboxToggle(selectedValues.value, id));
}

function onSelectRadio(groupId: T, radioId: T) {
	const group = findRadioGroup(props.items, groupId);
	const radioIds = group?.children.map((radio) => radio.id) ?? [];
	setSelected(applyRadioSelection(selectedValues.value, radioIds, radioId));
}

function onSubmenuToggle(itemId: T, open: boolean) {
	emit('submenu:toggle', itemId, open);
}

const menuState: ContextMenuState = {
	selectedValues,
	contentClass: computed(() => props.contentClass),
	onSelect,
	onToggleCheckbox,
	onSelectRadio,
	onSubmenuToggle,
};

provide(contextMenuStateKey, menuState);

watch(
	() => props.open,
	(open) => {
		if (open !== undefined) {
			internalOpen.value = open;
		}
	},
);

watch([internalOpen, triggerHostRef], ([open, host]) => {
	if (open && !host) return;
	void nextTick(() => {
		syncReka(Boolean(open));
	});
});

watch(
	() => props.position,
	(position) => {
		if (!internalOpen.value || !position) return;
		dispatchContextMenu();
	},
);

function openMenu() {
	if (props.disabled) return;
	setOpen(true);
}

function close() {
	setOpen(false);
}

defineExpose({ open: openMenu, close });
</script>

<template>
	<ContextMenuRoot :modal="modal" @update:open="setOpen">
		<ContextMenuRekaHandle ref="rekaHandleRef" />
		<ContextMenuTrigger as-child :disabled="disabled">
			<span
				ref="triggerHostRef"
				:class="[slots.trigger ? $style.trigger : $style.coordinateTrigger, triggerClass]"
				v-bind="triggerAttrs"
				:aria-hidden="slots.trigger ? undefined : true"
			>
				<slot v-if="slots.trigger" name="trigger" />
			</span>
		</ContextMenuTrigger>

		<ContextMenuPortal>
			<ContextMenuContent
				:id="id"
				:class="[$style.content, contentClass]"
				:collision-padding="COLLISION_PADDING_PX"
				data-test-id="context-menu"
				@close-auto-focus="emit('close-auto-focus', $event)"
			>
				<ContextMenuBody :nodes="items" :loading="loading" :loading-item-count="loadingItemCount">
					<template v-if="slots.loading" #loading>
						<slot name="loading" />
					</template>
					<template v-if="slots.empty" #empty>
						<slot name="empty" />
					</template>
					<template v-if="slots.item" #item="slotProps">
						<slot name="item" v-bind="slotProps" />
					</template>
					<template v-if="slots['item-leading']" #item-leading="slotProps">
						<slot name="item-leading" v-bind="slotProps" />
					</template>
					<template v-if="slots['item-label']" #item-label="slotProps">
						<slot name="item-label" v-bind="slotProps" />
					</template>
					<template v-if="slots['item-trailing']" #item-trailing="slotProps">
						<slot name="item-trailing" v-bind="slotProps" />
					</template>
				</ContextMenuBody>
			</ContextMenuContent>
		</ContextMenuPortal>
	</ContextMenuRoot>
</template>

<style module lang="scss">
@use './context-menu' as context-menu;

.content {
	@include context-menu.panel;
}

.trigger {
	display: inline-flex;
}

.coordinateTrigger {
	position: fixed;
	width: 1px;
	height: 1px;
	pointer-events: none;
	opacity: 0;
}
</style>
