<script setup lang="ts" generic="T extends ContextMenuId = ContextMenuId">
import { computed, useCssModule } from 'vue';

import type { ContextMenuId, ContextMenuItemSlots, ContextMenuLeaf } from './ContextMenu.types';
import type { IconColor } from '../../types/icon';
import type { TextColor } from '../../types/text';
import Icon from '../N8nIcon/Icon.vue';
import { N8nKeyboardShortcut } from '../N8nKeyboardShortcut';
import N8nText from '../N8nText/Text.vue';

defineOptions({ name: 'N8nContextMenuItemContent' });

const props = defineProps<{
	item: ContextMenuLeaf<T>;
	textColor?: TextColor;
	iconColor: IconColor | (string & {});
	title?: string;
}>();

const slots =
	defineSlots<Pick<ContextMenuItemSlots<T>, 'item-leading' | 'item-label' | 'item-trailing'>>();
const $style = useCssModule();

const leadingProps = computed(() => ({ class: $style.itemLeading }));
const labelProps = computed(() => ({ class: $style.itemLabel }));
const trailingProps = computed(() => ({ class: $style.itemTrailing }));

const leadingIconColor = computed(() => {
	const icon = props.item.icon;
	if (icon?.type === 'icon' && icon.color) {
		return icon.color;
	}
	return props.iconColor;
});
</script>

<template>
	<div :class="$style.content">
		<slot name="item-leading" :item="item" :ui="leadingProps">
			<Icon
				v-if="item.icon?.type === 'icon'"
				:icon="item.icon.value"
				:class="$style.itemLeading"
				:color="leadingIconColor"
				size="large"
			/>
			<span v-else-if="item.icon?.type === 'emoji'" :class="[$style.itemLeading, $style.emoji]">
				{{ item.icon.value }}
			</span>
		</slot>
		<slot name="item-label" :item="item" :ui="labelProps">
			<N8nText :class="$style.itemLabel" :title="title" size="medium" :color="textColor">
				{{ item.label }}
			</N8nText>
		</slot>
		<slot name="item-trailing" :item="item" :ui="trailingProps">
			<N8nKeyboardShortcut v-if="item.shortcut" v-bind="item.shortcut" :class="$style.shortcut" />
		</slot>
	</div>
</template>

<style module lang="scss">
@use '../../css/mixins/utils';

.content {
	display: contents;
}
.itemLeading {
	flex-shrink: 0;
}

.emoji {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xs);
}

.itemLabel {
	flex-grow: 1;
	min-width: 0;
	@include utils.utils-ellipsis;
}

.itemTrailing,
.shortcut {
	margin-left: auto;
	flex-shrink: 0;
}
</style>
