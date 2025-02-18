<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import type { UserAction } from 'n8n-design-system/types';

import N8nLoading from '../N8nLoading';

export type PathItem = {
	id: string;
	label: string;
	href?: string;
	current?: boolean;
};

// Items in the truncated path can be provided as an array or a function that returns a promise
type HiddenItemsSource = PathItem[] | (() => Promise<PathItem[]>);

type Props = {
	items: PathItem[];
	hiddenItemsSource?: HiddenItemsSource;
	cacheHiddenItems?: boolean;
	theme?: 'small' | 'medium';
	showBorder?: boolean;
	tooltipTrigger?: 'hover' | 'click';
	loadingSkeletonRows?: number;
	separator?: string;
};

defineOptions({ name: 'N8nBreadcrumbs' });

const emit = defineEmits<{
	tooltipOpened: [];
	tooltipClosed: [];
	hiddenItemsLoadingError: [error: unknown];
	itemSelected: [item: PathItem];
}>();

const props = withDefaults(defineProps<Props>(), {
	hiddenItemsSource: () => [],
	cacheHiddenItems: true,
	theme: 'medium',
	showBorder: false,
	tooltipTrigger: 'hover',
	loadingSkeletonRows: 3,
	separator: '/',
});

const loadedHiddenItems = ref<PathItem[]>([]);
const isLoadingHiddenItems = ref(false);

const hasHiddenItems = computed(() => {
	return Array.isArray(props.hiddenItemsSource)
		? props.hiddenItemsSource.length > 0
		: !!props.hiddenItemsSource;
});

const hiddenItemActions = computed((): UserAction[] => {
	return loadedHiddenItems.value.map((item) => ({
		value: item.id,
		label: item.label,
		disabled: false,
	}));
});

const getHiddenItems = async () => {
	if (typeof props.hiddenItemsSource !== 'function') {
		return;
	}
	// If hidden items are already loaded, do not fetch them again
	if (props.cacheHiddenItems && loadedHiddenItems.value.length > 0) {
		return;
	}

	isLoadingHiddenItems.value = true;
	try {
		const items = await props.hiddenItemsSource();
		loadedHiddenItems.value = items;
	} catch (error) {
		loadedHiddenItems.value = [];
		emit('hiddenItemsLoadingError', error);
	} finally {
		isLoadingHiddenItems.value = false;
	}
};

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
	await getHiddenItems();
};

const handleTooltipClose = () => {
	emit('tooltipClosed');
};

onMounted(() => {
	// If hidden items are provided as an array, set them right away
	if (Array.isArray(props.hiddenItemsSource)) {
		loadedHiddenItems.value = props.hiddenItemsSource;
	}
});
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
			<li v-if="$slots.prepend" :class="$style.separator" aria-hidden="true">{{ separator }}</li>
			<li
				v-if="hasHiddenItems"
				:class="{ [$style.ellipsis]: true, [$style.clickable]: hasHiddenItems }"
				data-test-id="ellipsis"
			>
				<div v-if="props.theme !== 'small'" :class="$style['hidden-items-menu']">
					<n8n-action-toggle
						:actions="hiddenItemActions"
						:loading="isLoadingHiddenItems"
						:loading-row-count="loadingSkeletonRows"
						theme="dark"
						placement="bottom"
						size="small"
						icon-orientation="horizontal"
						@visible-change="onHiddenMenuVisibleChange"
						@action="emitItemSelected"
					/>
				</div>
				<n8n-tooltip
					v-else
					:popper-class="[$style.tooltip, $style[props.theme]]"
					:trigger="tooltipTrigger"
					@before-show="handleTooltipShow"
					@hide="handleTooltipClose"
				>
					<template #content>
						<div v-if="isLoadingHiddenItems" :class="$style['tooltip-loading']">
							<N8nLoading
								:rows="props.theme === 'small' ? 1 : props.loadingSkeletonRows"
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
					<span>...</span>
				</n8n-tooltip>
			</li>
			<li v-if="hasHiddenItems" :class="$style.separator" aria-hidden="true">{{ separator }}</li>
			<template v-for="(item, index) in items" :key="item.id">
				<li
					:class="{ [$style.item]: true, [$style.current]: item.current }"
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
		padding: var(--spacing-4xs) var(--spacing-2xs);
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

.item.current * {
	font-weight: bold;
}

.ellipsis {
	&.clickable {
		cursor: pointer;
	}
}

.hidden-items {
	display: flex;
	align-items: center;
}

.hidden-items-menu {
	display: flex;
	position: relative;
	top: var(--spacing-5xs);
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
	& > div {
		display: flex;
		flex-direction: column;
		* {
			color: var(--color-text-lighter);
		}
	}
	&.medium {
		padding: var(--spacing-m) var(--spacing-s) !important;
		& > div {
			gap: var(--spacing-xs);

			* {
				font-size: var(--font-size-s);

				&:hover {
					color: var(--color-text-xlight);
				}
			}
		}
	}
	&.small {
		padding: var(--spacing-xs) var(--spacing-2xs) !important;
		& > div {
			gap: var(--spacing-2xs);

			* {
				color: var(--color-text-lighter);
				font-size: var(--font-size-2xs);
			}
		}

		.tooltip-loading {
			min-width: var(--spacing-4xl);
		}
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
		color: var(--color-text-light);
		font-size: var(--font-size-m);
	}

	.item a:hover * {
		color: var(--color-text-base);
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
		color: var(--prim-gray-670);
	}
}
</style>
