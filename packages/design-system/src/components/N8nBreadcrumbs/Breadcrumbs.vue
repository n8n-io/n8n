<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import N8nLoading from '../N8nLoading';

export type PathItem = {
	id: string;
	label: string;
	href?: string;
};

// Items in the truncated path can be provided as an array or a function that returns a promise
type HiddenItemsSource = PathItem[] | (() => Promise<PathItem[]>);

type Props = {
	items: PathItem[];
	hiddenItemsSource?: HiddenItemsSource;
	theme?: 'small' | 'medium';
	showBorder?: boolean;
	tooltipTrigger?: 'hover' | 'click';
	loadingSkeletonRows?: number;
};

defineOptions({ name: 'N8nBreadcrumbs' });

const emit = defineEmits<{
	beforeTooltipOpen: [];
	tooltipOpened: [];
	tooltipClosed: [];
}>();

const props = withDefaults(defineProps<Props>(), {
	theme: 'medium',
	showBorder: false,
	hiddenItemsSource: () => [],
	tooltipTrigger: 'hover',
	loadingSkeletonRows: 3,
});

const loadedHiddenItems = ref<PathItem[]>([]);
const isLoadingHiddenItems = ref(false);

const hasHiddenItems = computed(() => {
	return Array.isArray(props.hiddenItemsSource)
		? props.hiddenItemsSource.length > 0
		: !!props.hiddenItemsSource;
});

const handleBeforeTooltipShow = async () => {
	emit('beforeTooltipOpen');
	if (typeof props.hiddenItemsSource !== 'function') {
		return;
	}

	isLoadingHiddenItems.value = true;
	try {
		const items = await props.hiddenItemsSource();
		loadedHiddenItems.value = items;
	} catch (error) {
		loadedHiddenItems.value = [];
	} finally {
		isLoadingHiddenItems.value = false;
	}
};

const handleTooltipShow = () => {
	emit('tooltipOpened');
};

const handleTooltipClose = () => {
	emit('tooltipClosed');
};

onMounted(() => {
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
			<li v-if="$slots.prepend" :class="$style.separator" aria-hidden="true">/</li>
			<li
				v-if="hasHiddenItems"
				:class="{ [$style.ellipsis]: true, [$style.clickable]: hasHiddenItems }"
				aria-hidden="true"
				data-test-id="ellipsis"
			>
				<n8n-tooltip
					:popper-class="[$style.tooltip, $style[props.theme]]"
					:trigger="tooltipTrigger"
					@show="handleTooltipShow"
					@before-show="handleBeforeTooltipShow"
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
							<!-- For small theme, just render labels separated by slash -->
							<div v-if="props.theme === 'small'">
								<n8n-text>{{ loadedHiddenItems.map((item) => item.label).join(' / ') }}</n8n-text>
							</div>
							<div
								v-for="item in loadedHiddenItems"
								v-else
								:key="item.id"
								:class="$style.tooltipItem"
								data-test-id="breadcrumbs-item-hidden"
							>
								<n8n-link v-if="item.href" :href="item.href" theme="text">
									{{ item.label }}
								</n8n-link>
								<n8n-text v-else>{{ item.label }}</n8n-text>
							</div>
						</div>
					</template>
					<span>...</span>
				</n8n-tooltip>
			</li>
			<li v-if="hasHiddenItems" :class="$style.separator" aria-hidden="true">/</li>
			<template v-for="(item, index) in items" :key="item.id">
				<li :class="$style.item" data-test-id="breadcrumbs-item">
					<n8n-link v-if="item.href" :href="item.href" theme="text">{{ item.label }}</n8n-link>
					<n8n-text v-else>{{ item.label }}</n8n-text>
				</li>
				<li v-if="index !== items.length - 1" :class="$style.separator" aria-hidden="true">/</li>
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

.ellipsis {
	&.clickable {
		cursor: pointer;
	}
}

.hidden-items {
	display: flex;
	align-items: center;
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
</style>
