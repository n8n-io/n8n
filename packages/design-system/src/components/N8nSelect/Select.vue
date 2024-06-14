<script setup lang="ts">
import { computed, ref, useAttrs, useCssModule } from 'vue';
import { ElSelect } from 'element-plus';
import type { SelectSize } from 'n8n-design-system/types';
import type { PropType } from 'vue';
import { isEventBindingElementAttribute } from '../../utils';

type InnerSelectRef = InstanceType<typeof ElSelect>;

const props = defineProps({
	modelValue: {
		type: [String, Number, Array, Boolean] as PropType<string | number | string[] | boolean | null>,
		default: '',
	},
	size: {
		type: String as PropType<SelectSize>,
		default: 'large' as const,
	},
	placeholder: String,
	disabled: Boolean,
	filterable: Boolean,
	defaultFirstOption: Boolean,
	multiple: Boolean,
	filterMethod: Function,
	loading: Boolean,
	loadingText: String,
	popperClass: String,
	popperAppendToBody: Boolean,
	limitPopperWidth: Boolean,
	noDataText: String,
});

const attrs = useAttrs();
const cssClasses = useCssModule();
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

const popperClasses = computed(() => {
	const popperPropClasses = props.popperClass ?? '';

	return props.limitPopperWidth
		? `${popperPropClasses} ${cssClasses.limitPopperWidth}`
		: popperPropClasses;
});

const focus = () => {
	innerSelect.value?.focus();
};

const blur = () => {
	innerSelect.value?.blur();
};

const focusOnInput = () => {
	if (!innerSelect.value) return;

	const inputRef = innerSelect.value.$refs.input as HTMLInputElement | undefined;
	inputRef?.focus();
};

defineExpose({
	focus,
	blur,
	focusOnInput,
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
			:model-value="modelValue ?? undefined"
			:size="computedSize"
			:class="$style[classes]"
			:popper-class="popperClasses"
		>
			<template v-if="$slots.prefix" #prefix>
				<slot name="prefix" />
			</template>
			<template v-if="$slots.suffix" #suffix>
				<slot name="suffix" />
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

.limitPopperWidth {
	width: 0;

	li > span {
		text-overflow: ellipsis;
		overflow-x: hidden;
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
