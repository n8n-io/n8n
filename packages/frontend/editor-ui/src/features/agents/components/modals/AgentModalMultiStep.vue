<script setup lang="ts">
import type { DialogSize } from '@n8n/design-system';
import { computed, nextTick, ref, watch } from 'vue';

import AgentModal from './AgentModal.vue';

const props = withDefaults(
	defineProps<{
		open: boolean;
		step: string;
		title: string;
		editableTitle?: boolean;
		titlePlaceholder?: string;
		titleMaxLength?: number;
		titleError?: string;
		showBack?: boolean;
		showFooter?: boolean;
		showCancel?: boolean;
		busy?: boolean;
		size?: DialogSize;
		stacked?: boolean;
		trapFocus?: boolean;
		disableOutsidePointerEvents?: boolean;
	}>(),
	{
		editableTitle: false,
		titlePlaceholder: '',
		titleMaxLength: 128,
		titleError: '',
		showBack: false,
		showFooter: undefined,
		showCancel: true,
		busy: false,
		size: '2xlarge',
		stacked: false,
		trapFocus: true,
		disableOutsidePointerEvents: true,
	},
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	'update:title': [value: string];
	back: [];
	interactOutside: [event: Event];
}>();

const isPickerStep = computed(() => props.step === 'select' || props.step === 'list');
const stepChanged = ref(false);
watch(
	() => props.step,
	async () => {
		stepChanged.value = false;
		await nextTick();
		stepChanged.value = true;
	},
);
</script>

<template>
	<AgentModal
		:open="open"
		:title="title"
		:editable-title="editableTitle"
		:title-placeholder="titlePlaceholder"
		:title-max-length="titleMaxLength"
		:title-error="titleError"
		:show-back="showBack"
		:show-footer="showFooter"
		:show-cancel="showCancel"
		:body-scrollable="!isPickerStep"
		:busy="busy"
		:size="size"
		:stacked="stacked"
		:trap-focus="trapFocus"
		:disable-outside-pointer-events="disableOutsidePointerEvents"
		@interact-outside="emit('interactOutside', $event)"
		@update:open="emit('update:open', $event)"
		@update:title="emit('update:title', $event)"
		@back="emit('back')"
	>
		<template v-if="$slots.titlePrefix" #titlePrefix>
			<slot name="titlePrefix" />
		</template>
		<template #headerActions>
			<slot name="headerActions" />
		</template>

		<div :class="[$style.step, stepChanged && $style.stepChanged]" :data-step="step">
			<slot />
		</div>

		<template v-if="$slots.footerLeft" #footerLeft>
			<slot name="footerLeft" />
		</template>
		<template v-if="$slots.footerBeforeCancel" #footerBeforeCancel>
			<slot name="footerBeforeCancel" />
		</template>
		<template v-if="$slots.footerActions" #footerActions>
			<slot name="footerActions" />
		</template>
		<template v-if="$slots.footer" #footer>
			<slot name="footer" />
		</template>
	</AgentModal>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.step {
	min-height: 0;

	&[data-step='select'],
	&[data-step='list'] {
		min-height: min(60dvh, calc(var(--height--5xl) * 5));
	}
}

.stepChanged {
	--animation--fade-in--duration: var(--duration--snappy);
	--animation--fade-in--translate: var(--spacing--2xs);

	@include motion.fade-in;
}
</style>
