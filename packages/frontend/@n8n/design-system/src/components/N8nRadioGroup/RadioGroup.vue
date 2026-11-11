<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { computed, provide, ref, useAttrs } from 'vue';

import { RADIO_GROUP_ARROW_KEYS, radioGroupArrowKeyPressedKey } from './radio-group-context';
import type { RadioGroupProps, RadioGroupSlots } from './RadioGroup.types';
import { RadioGroupRoot, useForwardProps } from './reka-ui';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, ['class']));

const props = withDefaults(defineProps<Omit<RadioGroupProps, 'modelValue'>>(), {
	orientation: 'vertical',
	disabled: false,
});

defineSlots<RadioGroupSlots>();

const modelValue = defineModel<RadioGroupProps['modelValue']>();

const rootProps = useForwardProps(
	reactivePick(props, 'disabled', 'orientation', 'name', 'required', 'loop', 'dir', 'defaultValue'),
);

// reka-ui selects on arrow keys by listening on window (bubble phase): when roving focus
// moves to the next radio it programmatically clicks it. Parent containers that call
// stopPropagation on keydown (e.g. Modal.vue's @keydown.stop) prevent the event reaching
// window, so focus moves but the value does not update. We track arrow keys in capture
// phase here (before stopPropagation runs) and share the flag with RadioGroupItem, which
// clicks the focused radio on focusin when navigation came from an arrow key.
const arrowKeyPressed = ref(false);
provide(radioGroupArrowKeyPressedKey, arrowKeyPressed);

function onKeyDownCapture(event: KeyboardEvent) {
	if (RADIO_GROUP_ARROW_KEYS.includes(event.key as (typeof RADIO_GROUP_ARROW_KEYS)[number])) {
		arrowKeyPressed.value = true;
	}
}

function onKeyUp() {
	arrowKeyPressed.value = false;
}
</script>

<template>
	<RadioGroupRoot
		v-bind="{ ...rootProps, ...rootAttrs }"
		v-model="modelValue"
		:class="[$style.root, $style[orientation], rootClass]"
		@keydown.capture="onKeyDownCapture"
		@keyup="onKeyUp"
	>
		<slot />
	</RadioGroupRoot>
</template>

<style module>
.root {
	display: flex;
	gap: var(--spacing--xs);
}

.vertical {
	flex-direction: column;
	align-items: flex-start;
}

.horizontal {
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
}
</style>
