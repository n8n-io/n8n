<script setup lang="ts" generic="T = string, D = never">
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	DropdownMenuPortal,
} from 'reka-ui';
import { computed, inject, ref, useCssModule, watch } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nLoading from '@n8n/design-system/components/N8nLoading';
import N8nText from '@n8n/design-system/components/N8nText/Text.vue';

import {
	DropdownMenuPortalTargetKey,
	type DropdownMenuItemProps,
	type DropdownMenuItemSlots,
} from './DropdownMenu.types';
import DropdownMenuSearchableContent from './DropdownMenuSearchableContent.vue';

defineOptions({ name: 'N8nDropdownMenuItem', inheritAttrs: false });

const props = withDefaults(
	defineProps<DropdownMenuItemProps<T, D> & { htmlId?: string; disablePointerFocus?: boolean }>(),
	{
		loadingItemCount: 3,
		disablePointerFocus: false,
	},
);
defineSlots<DropdownMenuItemSlots<T, D>>();

const emit = defineEmits<{
	select: [value: T];
	search: [searchTerm: string, itemId: T];
	'update:subMenuOpen': [open: boolean];
	pointermove: [];
}>();

const $style = useCssModule();
const portalTarget = inject(DropdownMenuPortalTargetKey, ref(undefined));

const internalSubMenuOpen = ref(false);

const handleChildSearch = (term: string, itemId: T) => {
	emit('search', term, itemId);
};

const hasChildren = computed(() => props.children && props.children.length > 0);
const hasSubMenu = computed(() => hasChildren.value || props.loading || props.searchable);

const handleSubMenuOpenChange = (open: boolean) => {
	internalSubMenuOpen.value = open;
	emit('update:subMenuOpen', open);
};

const closeSubMenu = () => {
	internalSubMenuOpen.value = false;
	emit('update:subMenuOpen', false);
};

const leadingProps = computed(() => ({
	class: $style['item-leading'],
}));

const labelProps = computed(() => ({
	class: $style['item-label'],
}));

const trailingProps = computed(() => ({
	class: $style['item-trailing'],
}));

const titleAttr = computed(() => (props.label.length >= 20 ? props.label : undefined));

const handleSelect = (value: T) => {
	emit('select', value);
};

const handleItemSelect = () => {
	if (!props.disabled && !hasSubMenu.value) {
		emit('select', props.id);
	}
};

const handlePointerMove = (event: PointerEvent) => {
	emit('pointermove');

	if (props.disablePointerFocus && !hasSubMenu.value) {
		event.stopImmediatePropagation();
	}
};

// Sync internal state with prop when prop changes (controlled mode)
watch(
	() => props.subMenuOpen,
	(newValue) => {
		if (newValue !== undefined) {
			internalSubMenuOpen.value = newValue;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div ref="itemRef" :class="$style.wrapper">
		<DropdownMenuSeparator v-if="divided" :class="$style.separator" />

		<DropdownMenuSub
			v-if="hasSubMenu"
			:open="internalSubMenuOpen"
			@update:open="handleSubMenuOpenChange"
		>
			<DropdownMenuSubTrigger
				:id="htmlId"
				:aria-selected="highlighted || undefined"
				@pointermove.capture="handlePointerMove"
				:disabled="disabled"
				:data-test-id="testId"
				:class="[$style.item, $style['sub-trigger'], props.class, { 'is-disabled': !!disabled }]"
			>
				<slot name="item-leading" :item="props" :ui="leadingProps">
					<Icon
						v-if="icon?.type === 'icon'"
						:icon="icon.value"
						:class="[$style['item-leading'], $style.icon]"
						:color="disabled ? 'text-xlight' : 'text-light'"
						size="large"
					/>
					<span v-else-if="icon?.type === 'emoji'" :class="[$style['item-leading'], $style.emoji]">
						{{ icon.value }}
					</span>
				</slot>
				<slot name="item-label" :item="props" :ui="labelProps">
					<N8nText
						:class="$style['item-label']"
						:title="titleAttr"
						size="medium"
						:color="disabled ? 'text-xlight' : 'text-dark'"
					>
						{{ label }}
					</N8nText>
				</slot>
				<Icon
					icon="chevron-right"
					:class="$style['sub-indicator']"
					:color="disabled ? 'text-xlight' : 'text-light'"
					size="large"
				/>
			</DropdownMenuSubTrigger>

			<DropdownMenuPortal v-bind="portalTarget ? { to: portalTarget } : {}">
				<DropdownMenuSubContent
					ref="subContentRef"
					:class="$style['sub-content']"
					:side-offset="1"
					:prioritize-position="true"
					sticky="partial"
				>
					<DropdownMenuSearchableContent
						v-if="searchable"
						:open="internalSubMenuOpen"
						:items="children ?? []"
						:search-placeholder="searchPlaceholder"
						@select="handleSelect"
						@search="(term: string, itemId?: T) => emit('search', term, itemId ?? props.id)"
						@close="closeSubMenu"
					>
						<template #default="searchableContent">
							<div v-if="loading" :class="$style['loading-container']">
								<N8nLoading
									v-for="i in loadingItemCount"
									:key="i"
									:rows="1"
									:class="$style['loading-item']"
									variant="p"
								/>
							</div>
							<template v-else-if="hasChildren">
								<div :class="$style['children-container']" data-menu-items>
									<template v-for="(child, childIndex) in props.children" :key="child.id">
										<N8nDropdownMenuItem
											v-bind="child"
											:html-id="searchableContent.getItemDomId(childIndex)"
											:highlighted="searchableContent.highlightedIndex === childIndex"
											:disable-pointer-focus="true"
											:divided="child.divided && childIndex > 0"
											@select="handleSelect"
											@search="handleChildSearch"
											@pointermove="searchableContent.onItemHover(childIndex)"
										>
											<template #item-leading="leadingProps">
												<slot name="item-leading" v-bind="leadingProps" />
											</template>
											<template #item-label="bodyProps">
												<slot name="item-label" v-bind="bodyProps" />
											</template>
											<template #item-trailing="trailingProps">
												<slot name="item-trailing" v-bind="trailingProps" />
											</template>
										</N8nDropdownMenuItem>
									</template>
								</div>
							</template>
						</template>
					</DropdownMenuSearchableContent>

					<template v-else>
						<div v-if="loading" :class="$style['loading-container']">
							<N8nLoading
								v-for="i in loadingItemCount"
								:key="i"
								:rows="1"
								:class="$style['loading-item']"
								variant="p"
							/>
						</div>
						<template v-else-if="hasChildren">
							<div :class="$style['children-container']" data-menu-items>
								<template v-for="(child, childIndex) in props.children" :key="child.id">
									<N8nDropdownMenuItem
										v-bind="child"
										:divided="child.divided && childIndex > 0"
										@select="handleSelect"
										@search="handleChildSearch"
									>
										<template #item-leading="leadingProps">
											<slot name="item-leading" v-bind="leadingProps" />
										</template>
										<template #item-label="bodyProps">
											<slot name="item-label" v-bind="bodyProps" />
										</template>
										<template #item-trailing="trailingProps">
											<slot name="item-trailing" v-bind="trailingProps" />
										</template>
									</N8nDropdownMenuItem>
								</template>
							</div>
						</template>
					</template>
				</DropdownMenuSubContent>
			</DropdownMenuPortal>
		</DropdownMenuSub>

		<!-- Regular item without children -->
		<DropdownMenuItem
			v-else
			:id="htmlId"
			:aria-selected="highlighted || undefined"
			@pointermove.capture="handlePointerMove"
			:disabled="disabled"
			:data-test-id="testId"
			:class="[$style.item, props.class, { 'is-disabled': !!disabled }]"
			@select="handleItemSelect"
		>
			<slot name="item-leading" :item="props" :ui="leadingProps">
				<Icon
					v-if="icon?.type === 'icon'"
					:icon="icon.value"
					:class="[$style['item-leading'], $style.icon]"
					:color="disabled ? 'text-xlight' : 'text-light'"
					size="large"
				/>
				<span v-else-if="icon?.type === 'emoji'" :class="[$style['item-leading'], $style.emoji]">
					{{ icon.value }}
				</span>
			</slot>
			<slot name="item-label" :item="props" :ui="labelProps">
				<N8nText
					:class="$style['item-label']"
					:title="titleAttr"
					size="medium"
					:color="disabled ? 'text-xlight' : 'text-dark'"
				>
					{{ label }}
				</N8nText>
			</slot>
			<slot name="item-trailing" :item="props" :ui="trailingProps" />
			<Icon
				v-if="checked"
				icon="check"
				:class="$style['item-check']"
				size="large"
				:color="disabled ? 'text-xlight' : 'text-light'"
			/>
		</DropdownMenuItem>
	</div>
</template>

<style module lang="scss">
.wrapper {
	display: contents;
}

.children-container {
	padding: var(--spacing--4xs);
	max-height: var(--reka-dropdown-menu-content-available-height);
	overflow-y: auto;
}

.item {
	font-size: var(--font-size--2xs);
	line-height: 1;
	border-radius: var(--radius--2xs);
	display: flex;
	align-items: center;
	min-height: var(--spacing--xl);
	padding: var(--spacing--2xs);
	position: relative;
	user-select: none;
	color: var(--text-color);
	gap: var(--spacing--2xs);
	outline: none;

	&:not([data-disabled]) {
		&:hover,
		&[data-highlighted],
		&[aria-selected='true'] {
			background-color: var(--background--hover);
			cursor: pointer;
		}
	}

	&[data-disabled] {
		color: var(--text-color--disabled);
		cursor: not-allowed;
	}

	:global([data-menu-items]:has([aria-selected='true'])) &:not([aria-selected='true']) {
		&:hover,
		&[data-highlighted] {
			background-color: transparent;
		}
	}
}

.sub-trigger {
	&[data-state='open'] {
		background-color: var(--background--active);
	}
}

.sub-indicator {
	margin-left: auto;
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.sub-content {
	min-width: 160px;
	border-radius: var(--radius--xs);
	box-shadow: var(--shadow--md), var(--shadow--outline);
	background-color: var(--background--surface);
	z-index: 999999;
}

.item-leading {
	flex-shrink: 0;
}

.emoji {
	font-size: var(--font-size--sm);
	line-height: 1;
}

.item-label {
	flex-grow: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.item-check,
.item-trailing {
	margin-left: auto;
	flex-shrink: 0;
}

.separator {
	height: 1px;
	background-color: var(--border-color);
	margin: var(--spacing--5xs) calc(var(--spacing--4xs) * -1);
}

.loading-container {
	padding: var(--spacing--4xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.loading-item div {
	height: var(--spacing--xl);
}

.empty-state {
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	text-align: center;
}
</style>
