<script setup lang="ts" generic="T extends ContextMenuId = ContextMenuId">
import {
	ContextMenuContent,
	ContextMenuPortal,
	ContextMenuRoot,
	ContextMenuTrigger,
} from 'reka-ui';
import { computed, provide, shallowRef, useCssModule } from 'vue';

import { COLLISION_PADDING_PX } from './ContextMenu.constants';
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
});

const emit = defineEmits<ContextMenuEmits<T>>();
const slots = defineSlots<ContextMenuSlots<T>>();
const $style = useCssModule();

const internalSelected = shallowRef<T[]>(props.defaultSelectedValues ?? []);
const selectedValues = computed(() => props.selectedValues ?? internalSelected.value);

function setSelected(next: T[]) {
	internalSelected.value = next;
	emit('update:selectedValues', next);
}

function onSelect(id: T) {
	emit('select', id);
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
</script>

<template>
	<ContextMenuRoot :modal="modal" @update:open="emit('update:open', $event)">
		<ContextMenuTrigger as-child :disabled="disabled">
			<slot name="trigger" />
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
@use '@n8n/design-system/css/mixins/popover' as popover;

.content {
	@include popover.popover-surface;
	@include popover.popover-placement-offsets;

	display: flex;
	flex-direction: column;
	width: var(--context-menu--width, fit-content);
	min-width: var(--spacing--4xl);
	max-width: var(--context-menu--width, 24rem);
	max-height: var(--reka-context-menu-content-available-height);
}
</style>
