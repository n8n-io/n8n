<script setup lang="ts">
import { useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import type { InputSize } from '@n8n/design-system/components/N8nInput/Input.types';

import type {
	ComboboxItemDefaultProps,
	ComboboxItemDefaultSlots,
} from './ComboboxItemDefault.types';

const props = withDefaults(defineProps<ComboboxItemDefaultProps>(), {
	size: 'large',
});

defineSlots<ComboboxItemDefaultSlots>();

const $style = useCssModule();

const sizes: Record<InputSize, string> = {
	mini: $style.mini,
	small: $style.small,
	medium: $style.medium,
	large: $style.large,
	xlarge: $style.xlarge,
};
</script>

<template>
	<div :class="[$style.root, sizes[size]]" :data-disabled="disabled || undefined">
		<slot name="item-leading" :item="props" :ui="{ class: $style.itemLeading }">
			<Icon v-if="icon" :icon="icon" :class="$style.itemLeading" />
		</slot>

		<span :class="$style.itemText">
			<slot name="item-label" :item="props">
				{{ label }}
			</slot>
		</span>

		<slot name="item-trailing" :item="props" :ui="{ class: $style.itemTrailing }" />

		<slot name="item-indicator" :ui="{ class: $style.itemIndicator }" />
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/input' as input-mixin;

.root {
	display: flex;
	align-items: center;
	width: 100%;
	min-width: 0;
	gap: var(--spacing--2xs);
	position: relative;
	user-select: none;
	color: var(--text-color);
	outline: none;

	@include input-mixin.size-variables('large');
	--input--line-height: var(--line-height--md);

	font-size: var(--input--font-size);
	line-height: var(--input--line-height);
	min-height: var(--input--height);
	padding: 0 var(--input--padding);
	border-radius: calc(
		var(--combobox-content--radius, var(--radius--xs)) - var(
				--combobox-viewport--padding,
				var(--spacing--4xs)
			)
	);

	&.mini {
		@include input-mixin.size-variables('mini');
		--input--line-height: var(--line-height--sm);
	}

	&.small {
		@include input-mixin.size-variables('small');
		--input--line-height: var(--line-height--sm);
	}

	&.medium {
		@include input-mixin.size-variables('medium');
		--input--line-height: var(--line-height--md);
	}

	&.large {
		@include input-mixin.size-variables('large');
		--input--line-height: var(--line-height--md);
	}

	&.xlarge {
		@include input-mixin.size-variables('xlarge');
		--input--line-height: var(--line-height--md);
	}

	&:not([data-disabled]) {
		&[data-highlighted] {
			background-color: var(--background--hover);
			cursor: pointer;
		}

		&:hover {
			cursor: pointer;
		}
	}

	&[data-disabled] {
		color: var(--text-color--disabled);
		cursor: not-allowed;
	}
}

.itemLeading {
	flex-shrink: 0;
}

.itemText {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.itemIndicator,
.itemTrailing {
	margin-left: auto;
	flex-shrink: 0;
}
</style>
