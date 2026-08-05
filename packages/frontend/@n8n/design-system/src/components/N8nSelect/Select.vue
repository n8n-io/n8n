<script setup lang="ts">
import { ElSelect } from 'element-plus';
import type { ComponentPublicInstance, PropType, Ref } from 'vue';
import { computed, ref, useAttrs } from 'vue';

import type { InnerSelectRef, N8nSelectExposed } from './Select.types';
import type { SelectSize } from '../../types';
import { isEventBindingElementAttribute } from '../../utils';

/**
 * `ElSelect.props` is typed as `any`, and spreading `any` collapses this whole
 * object literal to `any` — which is why the emitted declarations published no
 * prop names for this component. Casting the spread to element-plus' own
 * resolved prop types restores the names. The cast is erased at build time, so
 * the runtime prop declarations remain exactly the spread: every prop
 * element-plus accepts is still declared here, and still forwarded.
 */
type ElSelectPropsOptions = {
	[K in Exclude<
		keyof InnerSelectRef['$props'],
		`on${string}` | 'key' | 'ref' | 'ref_for' | 'ref_key' | 'class' | 'style'
	>]-?: { type: PropType<InnerSelectRef['$props'][K]> };
};

const props = defineProps({
	...(ElSelect.props as ElSelectPropsOptions),
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
const innerSelect: Ref<InnerSelectRef | null> = ref(null);

/**
 * Assigned via a function ref rather than `ref="innerSelect"`. A string ref
 * registers in vue-tsc's `__VLS_TemplateRefs`, which materialises element-plus'
 * full ElSelect instance type — too large for the compiler to serialize, so the
 * declaration for this component was silently skipped (TS7056).
 */
const setInnerSelect = (el: Element | ComponentPublicInstance | null) => {
	innerSelect.value = (el as InnerSelectRef | null) ?? null;
};

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

// Declared rather than inferred from the template: inferring them drags
// element-plus' ElSelect types into `__VLS_template`, which the compiler will
// not serialize (TS7056), and the declaration for this component is then skipped.
defineSlots<{
	default?: () => unknown;
	prepend?: () => unknown;
	prefix?: () => unknown;
	suffix?: () => unknown;
	footer?: () => unknown;
	empty?: () => unknown;
}>();

defineExpose<N8nSelectExposed>({
	focus,
	blur,
	focusOnInput,
	// A getter, not the ref itself: exposing the ref makes vue-tsc unwrap it
	// through `ShallowUnwrapRef`, which loses the `InnerSelectRef` name and
	// expands element-plus' instance type past what it will serialize (TS7056).
	get innerSelect() {
		return innerSelect.value;
	},
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
			:ref="setInnerSelect"
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
	--input--font-size: var(--font-size--md);
	input {
		height: 48px;
	}
}

.container {
	display: inline-flex;
	width: 100%;
	--input--color--background: light-dark(var(--color--neutral-white), var(--color--neutral-950));
}

.withPrepend {
	input {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		@-moz-document url-prefix() {
			padding: 0 var(--spacing--3xs);
		}
	}
}

.prepend {
	font-size: var(--font-size--2xs);
	border: var(--border);
	border-right: none;
	display: flex;
	align-items: center;
	padding: 0 var(--spacing--3xs);
	background-color: var(--input--color--background);
	border-bottom-left-radius: var(--input--radius, var(--radius));
	border-top-left-radius: var(--input--radius, var(--radius));
	color: var(--color--text);
	white-space: nowrap;
}
</style>
