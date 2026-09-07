<script setup lang="ts">
import { N8nIconPicker, type IconOrEmoji } from '@n8n/design-system';
import type { ParameterInputEmits, ParameterInputProps } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { IconOrEmojiSchema } from 'n8n-workflow';
import { computed, ref, watch } from 'vue';

/**
 * The `icon` parameter input. The picker, the tooltip fallback, the size rule and the
 * value adapter all come over unchanged from `ParameterInput.vue`'s built-in branch.
 *
 * The shell keeps expression rendering for this type, so this component only ever
 * mounts for a fixed value: `capabilities.ownsExpressionRendering` stays false, and
 * `showContributedComponent` then yields to the expression editor first — the same
 * rule the old `!isModelValueExpression && !forceShowExpression` guard had.
 *
 * `inheritAttrs: false`, because the shell hands every `ParameterInputProps` to
 * whatever occupies the input slot. This input reads four of them, and the rest must
 * not fall through onto the DOM — `eventBus` alone would land there as
 * `[object Object]`.
 */
defineOptions({ inheritAttrs: false });

const props =
	defineProps<Pick<ParameterInputProps, 'parameter' | 'modelValue' | 'isReadOnly' | 'hideLabel'>>();

const emit = defineEmits<Pick<ParameterInputEmits, 'update:modelValue' | 'focus' | 'blur'>>();

const i18n = useI18n();

/**
 * The picked value, held until the shell's value returns. The shell debounces
 * `update:modelValue` by 100 ms before the store round-trip puts it back on
 * `modelValue`, and `N8nIconPicker` renders from the prop rather than from its own
 * local state (it sees a bound value plus a listener, so `defineModel` does not
 * update locally). Without this the button would show the previous icon for 100 ms.
 */
const pendingValue = ref<IconOrEmoji>();

watch(
	() => props.modelValue,
	() => {
		pendingValue.value = undefined;
	},
);

const selectedValue = computed<IconOrEmoji | undefined>(() => {
	if (pendingValue.value) return pendingValue.value;

	const result = IconOrEmojiSchema.safeParse(props.modelValue);
	if (result.success) {
		return {
			type: result.data.type,
			value: result.data.value,
		} as IconOrEmoji;
	}
	return undefined;
});

const buttonTooltip = computed(
	() =>
		// `||`, not `??`: an empty `placeholder` has to fall back too. This is the rule the
		// built-in branch had.
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		props.parameter.placeholder || i18n.baseText('parameterInput.iconPicker.tooltip'),
);

function onPick(value: IconOrEmoji | undefined) {
	pendingValue.value = value;
	emit('update:modelValue', value ? { type: value.type, value: value.value } : undefined);
}
</script>

<template>
	<N8nIconPicker
		:model-value="selectedValue"
		:button-tooltip="buttonTooltip"
		:button-size="props.hideLabel ? 'small' : 'large'"
		:is-read-only="props.isReadOnly"
		@update:model-value="onPick"
		@focus="emit('focus')"
		@blur="emit('blur')"
	/>
</template>
