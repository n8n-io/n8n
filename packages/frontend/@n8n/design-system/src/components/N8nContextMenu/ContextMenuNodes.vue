<script setup lang="ts" generic="T extends ContextMenuId = ContextMenuId">
import { ContextMenuLabel, ContextMenuRadioGroup } from 'reka-ui';
import { computed, inject, useCssModule } from 'vue';

import {
	contextMenuStateKey,
	type ContextMenuId,
	type ContextMenuItemSlots,
	type ContextMenuNode,
	type ContextMenuRadioGroup as ContextMenuRadioGroupNode,
} from './ContextMenu.types';
import { radioGroupValue } from './ContextMenu.utils';
import ContextMenuItem from './ContextMenuItem.vue';
import N8nText from '../N8nText/Text.vue';

defineOptions({ name: 'N8nContextMenuNodes' });

const props = defineProps<{
	nodes: Array<ContextMenuNode<T>>;
}>();

const slots = defineSlots<ContextMenuItemSlots<T>>();

const $style = useCssModule();
const state = inject(contextMenuStateKey);

const selectedValues = computed(() => state?.selectedValues.value ?? []);

function isRow(node: ContextMenuNode<T>) {
	return node.type === 'item' || node.type === 'checkbox' || node.type === 'submenu';
}

function radioModelValue(group: ContextMenuRadioGroupNode<T>) {
	return radioGroupValue(group, selectedValues.value);
}

function onRadioGroupChange(group: ContextMenuRadioGroupNode<T>, value: string | undefined) {
	const radio = group.children.find((item) => item.id === value);
	if (!radio) return;
	state?.onSelectRadio(group.id, radio.id);
}
</script>

<template>
	<div :class="$style.nodes">
		<template v-for="(node, index) in props.nodes" :key="node.id">
			<div
				v-if="node.type === 'group'"
				:class="[$style.group, index > 0 && $style.separated, node.class]"
			>
				<ContextMenuLabel v-if="node.label" :class="$style.header">
					<N8nText size="small" color="text-light" bold>{{ node.label }}</N8nText>
				</ContextMenuLabel>
				<ContextMenuNodes :nodes="node.children">
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
					<template v-if="slots.empty" #empty>
						<slot name="empty" />
					</template>
				</ContextMenuNodes>
			</div>

			<div
				v-else-if="node.type === 'radio-group'"
				:class="[$style.group, index > 0 && $style.separated, node.class]"
			>
				<ContextMenuLabel v-if="node.label" :class="$style.header">
					<N8nText size="small" color="text-light" bold>{{ node.label }}</N8nText>
				</ContextMenuLabel>
				<ContextMenuRadioGroup
					:model-value="radioModelValue(node)"
					@update:model-value="onRadioGroupChange(node, $event)"
				>
					<template v-for="radio in node.children" :key="radio.id">
						<slot name="item" :item="radio">
							<ContextMenuItem :item="radio">
								<template v-if="slots['item-leading']" #item-leading="slotProps">
									<slot name="item-leading" v-bind="slotProps" />
								</template>
								<template v-if="slots['item-label']" #item-label="slotProps">
									<slot name="item-label" v-bind="slotProps" />
								</template>
								<template v-if="slots['item-trailing']" #item-trailing="slotProps">
									<slot name="item-trailing" v-bind="slotProps" />
								</template>
							</ContextMenuItem>
						</slot>
					</template>
				</ContextMenuRadioGroup>
			</div>

			<div v-else-if="node.type === 'submenu'" :class="index > 0 && $style.separated">
				<slot name="item" :item="node">
					<ContextMenuItem :item="node">
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
						<template v-if="slots.empty" #empty>
							<slot name="empty" />
						</template>
					</ContextMenuItem>
				</slot>
			</div>

			<slot v-else-if="isRow(node)" name="item" :item="node">
				<ContextMenuItem :item="node">
					<template v-if="slots['item-leading']" #item-leading="slotProps">
						<slot name="item-leading" v-bind="slotProps" />
					</template>
					<template v-if="slots['item-label']" #item-label="slotProps">
						<slot name="item-label" v-bind="slotProps" />
					</template>
					<template v-if="slots['item-trailing']" #item-trailing="slotProps">
						<slot name="item-trailing" v-bind="slotProps" />
					</template>
					<template v-if="slots.empty" #empty>
						<slot name="empty" />
					</template>
				</ContextMenuItem>
			</slot>
		</template>
	</div>
</template>

<style module lang="scss">
.nodes {
	display: contents;
}

.separated {
	border-top: var(--border);
	padding-block-start: var(--context-menu--padding);
	margin-inline: calc(-1 * var(--context-menu--padding) + var(--border-width));
	padding-inline: calc(var(--context-menu--padding) - var(--border-width));
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.header {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--3xs);
	user-select: none;
}
</style>
