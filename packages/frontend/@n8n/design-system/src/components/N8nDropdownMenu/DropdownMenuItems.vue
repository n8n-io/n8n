<script setup lang="ts" generic="T = string, D = never">
import { useCssModule } from 'vue';

import N8nLoading from '@n8n/design-system/components/N8nLoading';

import type { DropdownMenuItemProps, DropdownMenuSlots } from './DropdownMenu.types';
import N8nDropdownMenuItem from './DropdownMenuItem.vue';

defineOptions({ name: 'N8nDropdownMenuItems' });

withDefaults(
	defineProps<{
		items: Array<DropdownMenuItemProps<T, D>>;
		loading?: boolean;
		loadingItemCount?: number;
		emptyText?: string;
		highlightedIndex?: number;
		openSubMenuIndex?: number;
		getItemDomId?: (index: number) => string;
		onItemHover?: (index: number) => void;
		disablePointerFocus?: boolean;
	}>(),
	{
		loading: false,
		loadingItemCount: 3,
		emptyText: 'No items',
		highlightedIndex: -1,
		openSubMenuIndex: -1,
	},
);

const emit = defineEmits<{
	select: [value: T];
	search: [searchTerm: string, itemId: T];
	'submenu:toggle': [index: number, open: boolean];
	'item-mouseup': [item: DropdownMenuItemProps<T, D>];
}>();

const slots =
	defineSlots<
		Pick<
			DropdownMenuSlots<T, D>,
			'loading' | 'empty' | 'item' | 'item-leading' | 'item-label' | 'item-trailing'
		>
	>();

const $style = useCssModule();
</script>

<template>
	<div :class="$style['items-container']" data-menu-items>
		<template v-if="loading">
			<slot name="loading">
				<N8nLoading
					v-for="i in loadingItemCount"
					:key="i"
					:rows="1"
					:class="$style['loading-item']"
					variant="p"
				/>
			</slot>
		</template>
		<template v-else-if="items.length === 0">
			<slot name="empty">
				<div :class="$style['empty-state']">{{ emptyText }}</div>
			</slot>
		</template>
		<template v-else>
			<template v-for="(item, index) in items" :key="item.id">
				<slot name="item" :item="item">
					<N8nDropdownMenuItem
						v-bind="item"
						:html-id="getItemDomId?.(index)"
						:highlighted="highlightedIndex === index"
						:sub-menu-open="openSubMenuIndex === index"
						:disable-pointer-focus="disablePointerFocus"
						:divided="item.divided && index > 0"
						@select="emit('select', $event)"
						@search="(term: string, itemId: T) => emit('search', term, itemId)"
						@update:sub-menu-open="(open: boolean) => emit('submenu:toggle', index, open)"
						@pointermove="onItemHover?.(index)"
						@mouseup="emit('item-mouseup', item)"
					>
						<template v-if="slots['item-leading']" #item-leading="slotProps">
							<slot name="item-leading" v-bind="slotProps" />
						</template>
						<template v-if="slots['item-label']" #item-label="slotProps">
							<slot name="item-label" v-bind="slotProps" />
						</template>
						<template v-if="slots['item-trailing']" #item-trailing="slotProps">
							<slot name="item-trailing" v-bind="slotProps" />
						</template>
					</N8nDropdownMenuItem>
				</slot>
			</template>
		</template>
	</div>
</template>

<style module lang="scss">
.items-container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs);
}

.loading-item div {
	height: var(--spacing--xl);
}

.empty-state {
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	text-align: center;
}
</style>
