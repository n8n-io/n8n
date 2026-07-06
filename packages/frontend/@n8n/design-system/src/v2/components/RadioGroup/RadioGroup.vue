<script setup lang="ts">
import { reactivePick } from '@vueuse/core';
import { RadioGroupRoot, useForwardPropsEmits } from 'reka-ui';
import { provide, ref } from 'vue';

import { RADIO_GROUP_ARROW_KEYS, radioGroupArrowKeyPressedKey } from './radio-group-context';
import type { RadioGroupEmits, RadioGroupProps, RadioGroupSlots } from './RadioGroup.types';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<RadioGroupProps>(), {
	orientation: 'vertical',
	disabled: false,
});

const emit = defineEmits<RadioGroupEmits>();
defineSlots<RadioGroupSlots>();

const modelValue = defineModel<RadioGroupProps['modelValue']>();

const rootProps = useForwardPropsEmits(
	reactivePick(props, 'disabled', 'orientation', 'name', 'required', 'loop', 'dir', 'defaultValue'),
	emit,
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
		v-bind="{ ...rootProps, ...$attrs }"
		v-model="modelValue"
		:class="[$style.root, $style[orientation]]"
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
