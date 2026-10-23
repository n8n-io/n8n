<script setup lang="ts" generic="T extends ContextMenuId = ContextMenuId">
import { useCssModule } from 'vue';

import type { ContextMenuId, ContextMenuNode, ContextMenuSlots } from './ContextMenu.types';
import ContextMenuNodes from './ContextMenuNodes.vue';
import { useI18n } from '../../composables/useI18n';
import N8nLoading from '../N8nLoading';

defineOptions({ name: 'N8nContextMenuBody' });

withDefaults(
	defineProps<{
		nodes: Array<ContextMenuNode<T>>;
		loading?: boolean;
		loadingItemCount?: number;
	}>(),
	{
		loading: false,
		loadingItemCount: 3,
	},
);

const slots = defineSlots<Omit<ContextMenuSlots<T>, 'trigger'>>();

const $style = useCssModule();
const { t } = useI18n();
</script>

<template>
	<div :class="$style.scroll">
		<template v-if="loading">
			<slot name="loading">
				<div :class="$style.items">
					<N8nLoading
						v-for="i in loadingItemCount"
						:key="i"
						:rows="1"
						:class="$style.loadingItem"
						variant="p"
					/>
				</div>
			</slot>
		</template>
		<template v-else-if="nodes.length === 0">
			<slot name="empty">
				<div :class="$style.emptyState">{{ t('contextMenu.noItems') }}</div>
			</slot>
		</template>
		<div v-else :class="$style.items" data-menu-items>
			<ContextMenuNodes :nodes="nodes">
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
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/mixins' as scrollbar-mixins;

.scroll {
	--context-menu--padding: var(--spacing--4xs);

	min-width: 0;
	min-height: 0;
	width: 100%;
	flex: 1 1 auto;
	overflow-y: auto;
	@include scrollbar-mixins.hoverable-scroll-bar;
}

.items {
	display: flex;
	flex-direction: column;
	gap: var(--context-menu--padding);
	padding: var(--context-menu--padding);
}

.loadingItem {
	div {
		height: calc(var(--spacing--2xs) * 2 + var(--font-size--sm) * var(--line-height--lg));
		margin-top: 0;
	}
}

.emptyState {
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	text-align: center;
}
</style>
