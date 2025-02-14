<script lang="ts" setup>
import { computed } from 'vue';

export type PathItem = {
	id: string;
	label: string;
	href?: string;
};

type Props = {
	items: PathItem[];
	hasHiddenItems?: boolean;
	// For mvp decided to go with string here
	// but can be changed to PathItem[] if we want to have more control in the future
	hiddenItemsTooltip: string;
	theme: 'small' | 'medium';
	showBorder?: boolean;
};

const emit = defineEmits<{
	beforeTooltipOpen: [];
	tooltipOpened: [];
	tooltipClosed: [];
}>();

defineOptions({ name: 'N8nBreadcrumbs' });

const props = withDefaults(defineProps<Props>(), {
	theme: 'medium',
	hasHiddenItems: false,
	hiddenItemsTooltip: '',
	showBorder: false,
});

const tooltipText = computed(() => {
	return props.hiddenItemsTooltip;
});

const handleBeforeTooltipShow = () => {
	emit('beforeTooltipOpen');
};

const handleTooltipShow = () => {
	emit('tooltipOpened');
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
			<li v-if="$slots.prepend" :class="$style.separator" aria-hidden="true">/</li>
			<li
				v-if="props.hasHiddenItems"
				:class="{ [$style.ellipsis]: true, [$style.clickable]: tooltipText !== '' }"
				aria-hidden="true"
			>
				<n8n-tooltip
					:content="tooltipText"
					:popper-class="[$style.tooltip, $style[props.theme]]"
					:disabled="!tooltipText"
					@show="handleTooltipShow"
					@before-show="handleBeforeTooltipShow"
					@hide="handleTooltipClose"
				>
					<span>...</span>
				</n8n-tooltip>
			</li>
			<li v-if="props.hasHiddenItems" :class="$style.separator" aria-hidden="true">/</li>
			<template v-for="(item, index) in items" :key="item.id">
				<li :class="$style.item">
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
			color: var(--color-text-light);

			&:hover {
				color: var(--color-text-lighter);
			}
		}
	}
	&.medium {
		padding: var(--spacing-m) var(--spacing-s) !important;
		& > div {
			gap: var(--spacing-xs);

			* {
				font-size: var(--font-size-s);
			}
		}
	}
	&.small {
		padding: var(--spacing-xs) var(--spacing-2xs) !important;
		& > div {
			gap: var(--spacing-2xs);

			* {
				font-size: var(--font-size-2xs);
			}
		}
	}
}
</style>
