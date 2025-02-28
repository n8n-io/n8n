<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { UserAction } from '@n8n/design-system/types';

import N8nLoading from '../N8nLoading';

export type PathItem = {
	id: string;
	label: string;
	href?: string;
};

type Props = {
	items: PathItem[];
	hiddenItems?: PathItem[] | Promise<PathItem[]>;
	theme?: 'small' | 'medium';
	showBorder?: boolean;
	loadingSkeletonRows?: number;
	separator?: string;
	highlightLastItem?: boolean;
	// Setting this to true will show the ellipsis even if there are no hidden items
	pathTruncated?: boolean;
};

defineOptions({ name: 'N8nBreadcrumbs' });

const emit = defineEmits<{
	tooltipOpened: [];
	tooltipClosed: [];
	hiddenItemsLoadingError: [error: unknown];
	itemSelected: [item: PathItem];
}>();

const props = withDefaults(defineProps<Props>(), {
	hiddenItems: () => new Array<PathItem>(),
	theme: 'medium',
	showBorder: false,
	loadingSkeletonRows: 3,
	separator: '/',
	highlightLastItem: true,
	isPathTruncated: false,
});

const loadedHiddenItems = ref<PathItem[]>([]);
const isLoadingHiddenItems = ref(false);
const currentPromise = ref<Promise<PathItem[]> | null>(null);

const hasHiddenItems = computed(() => {
	return Array.isArray(props.hiddenItems)
		? props.hiddenItems.length > 0
		: props.hiddenItems !== undefined;
});

const showEllipsis = computed(() => {
	return props.items.length && (hasHiddenItems.value || props.pathTruncated);
});

const dropdownDisabled = computed(() => {
	return props.pathTruncated && !hasHiddenItems.value;
});

const hiddenItemActions = computed((): UserAction[] => {
	return loadedHiddenItems.value.map((item) => ({
		value: item.id,
		label: item.label,
		disabled: false,
	}));
});

const getHiddenItems = async () => {
	// If we already have items loaded and the source hasn't changed, use cache
	if (loadedHiddenItems.value.length > 0 && props.hiddenItems === currentPromise.value) {
		return;
	}

	// Handle synchronous array
	if (Array.isArray(props.hiddenItems)) {
		loadedHiddenItems.value = props.hiddenItems;
		return;
	}

	isLoadingHiddenItems.value = true;
	try {
		// Store the current promise for cache comparison
		currentPromise.value = props.hiddenItems;
		const items = await props.hiddenItems;
		loadedHiddenItems.value = items;
	} catch (error) {
		loadedHiddenItems.value = [];
		emit('hiddenItemsLoadingError', error);
	} finally {
		isLoadingHiddenItems.value = false;
	}
};

watch(
	(): PathItem[] | Promise<PathItem[]> => props.hiddenItems,
	(_newValue: PathItem[] | Promise<PathItem[]>) => {
		void getHiddenItems();
	},
);

const onHiddenMenuVisibleChange = async (visible: boolean) => {
	if (visible) {
		emit('tooltipOpened');
		await getHiddenItems();
	} else {
		emit('tooltipClosed');
	}
};

const emitItemSelected = (id: string) => {
	const item = [...loadedHiddenItems.value, ...props.items].find((i) => i.id === id);
	if (!item) {
		return;
	}
	emit('itemSelected', item);
};

const handleTooltipShow = async () => {
	emit('tooltipOpened');
	await getHiddenItems();
};

const handleTooltipClose = () => {
	emit('tooltipClosed');
};
</script>
<template>
	<div
		:class="{
			[$style.container]: true,
			[$style.border]: props.showBorder,
			[$style[props.theme]]: true,
		}"
	>
		<slot name="prepend"></slot>
		<ul :class="$style.list">
			<li v-if="$slots.prepend && items.length" :class="$style.separator" aria-hidden="true">
				{{ separator }}
			</li>
			<li
				v-if="showEllipsis"
				:class="{ [$style.ellipsis]: true, [$style.disabled]: dropdownDisabled }"
				data-test-id="ellipsis"
			>
				<!-- Show interactive dropdown for larger versions -->
				<div v-if="props.theme !== 'small'" :class="$style['hidden-items-menu']">
					<n8n-action-toggle
						:actions="hiddenItemActions"
						:loading="isLoadingHiddenItems"
						:loading-row-count="loadingSkeletonRows"
						:disabled="dropdownDisabled"
						:class="$style['action-toggle']"
						theme="dark"
						placement="bottom"
						size="small"
						icon-orientation="horizontal"
						@visible-change="onHiddenMenuVisibleChange"
						@action="emitItemSelected"
					>
						<n8n-text :bold="true" :class="$style.dots">...</n8n-text>
					</n8n-action-toggle>
				</div>
				<!-- Just a tooltip for smaller versions -->
				<n8n-tooltip
					v-else
					:popper-class="$style.tooltip"
					:disabled="dropdownDisabled"
					trigger="click"
					@before-show="handleTooltipShow"
					@hide="handleTooltipClose"
				>
					<template #content>
						<div v-if="isLoadingHiddenItems" :class="$style['tooltip-loading']">
							<N8nLoading
								:rows="1"
								:loading="isLoadingHiddenItems"
								animated
								variant="p"
								:shrink-last="false"
							/>
						</div>
						<div v-else :class="$style.tooltipContent">
							<div>
								<n8n-text>{{ loadedHiddenItems.map((item) => item.label).join(' / ') }}</n8n-text>
							</div>
						</div>
					</template>
					<span :class="$style['tooltip-ellipsis']">...</span>
				</n8n-tooltip>
			</li>
			<li v-if="showEllipsis" :class="$style.separator" aria-hidden="true">{{ separator }}</li>
			<template v-for="(item, index) in items" :key="item.id">
				<li
					:class="{
						[$style.item]: true,
						[$style.current]: props.highlightLastItem && index === items.length - 1,
					}"
					data-test-id="breadcrumbs-item"
					@click.prevent="emitItemSelected(item.id)"
				>
					<n8n-link v-if="item.href" :href="item.href" theme="text">{{ item.label }}</n8n-link>
					<n8n-text v-else>{{ item.label }}</n8n-text>
				</li>
				<li v-if="index !== items.length - 1" :class="$style.separator" aria-hidden="true">
					{{ separator }}
				</li>
			</template>
		</ul>
		<slot name="append"></slot>
	</div>
</template>
<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing-5xs);

	&.small {
		display: inline-flex;
		padding: var(--spacing-4xs) var(--spacing-3xs);
	}

	&.border {
		border: var(--border-base);
		border-radius: var(--border-radius-base);
	}
}

.list {
	display: flex;
	list-style: none;
}

.item.current span {
	color: var(--color-text-dark);
}

// Make disabled ellipsis look like a normal item
.ellipsis {
	.dots,
	.tooltip-ellipsis {
		cursor: pointer;
		user-select: none;
		color: var(--color-text-base);
	}
	&.disabled {
		.dots,
		.tooltip-ellipsis {
			cursor: default;
		}
		.dots {
			cursor: default;
			color: var(--color-text-base);
			&:hover {
				color: var(--color-text-base);
			}
		}
	}
}

.hidden-items-menu {
	display: flex;
	position: relative;
	top: var(--spacing-5xs);
	color: var(--color-text-base);
}

.tooltip-loading {
	min-width: var(--spacing-3xl);
	width: 100%;

	:global(.n8n-loading) > div {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	:global(.el-skeleton__item) {
		margin: 0;
	}
}

.tooltip {
	padding: var(--spacing-xs) var(--spacing-2xs);
	& > div {
		color: var(--color-text-lighter);
		span {
			font-size: var(--font-size-2xs);
		}
	}

	.tooltip-loading {
		min-width: var(--spacing-4xl);
	}
}

.dots {
	padding: 0 var(--spacing-4xs);
	color: var(--color-text-light);
	border-radius: var(--border-radius-base);

	&:hover,
	&:focus {
		background-color: var(--color-background-base);
		color: var(--color-primary);
	}
}

// Small theme overrides
.small {
	.list {
		gap: var(--spacing-5xs);
	}

	.item,
	.item * {
		color: var(--color-text-base);
		font-size: var(--font-size-2xs);
		font-weight: 600;
	}

	.item a:hover * {
		color: var(--color-text-dark);
	}

	.separator {
		font-size: var(--font-size-m);
		color: var(--color-text-base);
	}
}

// Medium theme overrides
.medium {
	li {
		padding: var(--spacing-4xs);
	}

	.item,
	.item * {
		color: var(--color-text-base);
		font-size: var(--font-size-m);
	}

	.item a:hover * {
		color: var(--color-text-dark);
	}

	.ellipsis {
		padding-right: 0;
		padding-left: 0;
		color: var(--color-text-light);
		&:hover {
			color: var(--color-text-base);
		}
	}

	.separator {
		font-size: var(--font-size-xl);
		color: var(--color-foreground-base);
	}
}
</style>
