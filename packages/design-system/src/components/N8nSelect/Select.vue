<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue';
import { ElSelect, type ISelectProps } from 'element-plus';
import type { SelectSize } from '../../types/select';
import { isEventBindingElementAttribute } from '../../utils/typeguards';

type InnerSelectRef = InstanceType<typeof ElSelect>;

defineOptions({ name: 'N8nSelect' });

interface Props extends Partial<Omit<ISelectProps, 'size'>> {
	size: SelectSize;
}
const props = withDefaults(defineProps<Props>(), {
	size: 'large',
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

const size = computed<ISelectProps['size']>(() => {
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
			:size="size"
			:popper-class="popperClass"
			:class="$style[classes]"
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
