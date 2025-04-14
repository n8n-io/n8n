<script setup lang="ts">
import { ElSelect } from 'element-plus';
import type { PropType } from 'vue';
import { computed, ref, useAttrs } from 'vue';

import type { SelectSize } from '@n8n/design-system/types';

import { isEventBindingElementAttribute } from '../../utils';

type InnerSelectRef = InstanceType<typeof ElSelect>;

const props = defineProps({
	...ElSelect.props,
	modelValue: {},
	size: {
		type: String as PropType<SelectSize>,
		default: 'large',
	},
	placeholder: {
		type: String,
	},
	disabled: {
		type: Boolean,
	},
	filterable: {
		type: Boolean,
	},
	defaultFirstOption: {
		type: Boolean,
	},
	multiple: {
		type: Boolean,
	},
	multipleLimit: {
		type: Number,
		default: 0,
	},
	filterMethod: {
		type: Function,
	},
	loading: {
		type: Boolean,
	},
	loadingText: {
		type: String,
	},
	popperClass: {
		type: String,
	},
	popperAppendToBody: {
		type: Boolean,
	},
	limitPopperWidth: {
		type: Boolean,
	},
	noDataText: {
		type: String,
	},
});

const attrs = useAttrs();
const innerSelect = ref<InnerSelectRef | null>(null);

const listeners = computed(() => {
	return Object.entries(attrs).reduce<Record<string, unknown>>((acc, [key, value]) => {
		if (isEventBindingElementAttribute(value, key)) {
			acc[key] = value;
		}
		return acc;
	}, {});
});

const computedSize = computed(() => {
	if (props.size === 'mini') {
		return 'small';
	}
	if (props.size === 'medium') {
		return 'default';
	}
	if (props.size === 'xlarge') {
		return undefined;
	}
	return props.size;
});

const classes = computed(() => {
	return props.size === 'xlarge' ? 'xlarge' : '';
});

const focus = () => {
	innerSelect.value?.focus();
};

const blur = () => {
	innerSelect.value?.blur();
};

const focusOnInput = () => {
	if (!innerSelect.value) return;

	const inputRef = innerSelect.value.$refs.selectWrapper as HTMLInputElement;

	const inputElement = inputRef?.querySelector('input');
	if (inputElement) inputElement.focus();
	else inputRef?.focus();
};

defineExpose({
	focus,
	blur,
	focusOnInput,
	innerSelect,
});
</script>

<template>
	<div
		:class="{
			'n8n-select': true,
			[$style.container]: true,
			[$style.withPrepend]: !!$slots.prepend,
		}"
	>
		<div v-if="$slots.prepend" :class="$style.prepend">
			<slot name="prepend" />
		</div>
		<ElSelect
			v-bind="{ ...$props, ...listeners }"
			ref="innerSelect"
			:multiple-limit="props.multipleLimit"
			:model-value="props.modelValue ?? undefined"
			:size="computedSize"
			:popper-class="props.popperClass"
			:class="$style[classes]"
		>
			<template v-if="$slots.prefix" #prefix>
				<slot name="prefix" />
			</template>
			<template v-if="$slots.suffix" #suffix>
				<slot name="suffix" />
			</template>
			<template v-if="$slots.footer" #footer>
				<slot name="footer" />
			</template>
			<template v-if="$slots.empty" #empty>
				<slot name="empty" />
			</template>
			<slot></slot>
		</ElSelect>
	</div>
</template>

<style lang="scss" module>
.xlarge {
	--input-font-size: var(--font-size-m);
	input {
		height: 48px;
	}
}

.container {
	display: inline-flex;
	width: 100%;
}

.withPrepend {
	input {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		@-moz-document url-prefix() {
			padding: 0 var(--spacing-3xs);
		}
	}
}

.prepend {
	font-size: var(--font-size-2xs);
	border: var(--border-base);
	border-right: none;
	display: flex;
	align-items: center;
	padding: 0 var(--spacing-3xs);
	background-color: var(--color-background-light);
	border-bottom-left-radius: var(--input-border-radius, var(--border-radius-base));
	border-top-left-radius: var(--input-border-radius, var(--border-radius-base));
	color: var(--color-text-base);
	white-space: nowrap;
}
</style>
