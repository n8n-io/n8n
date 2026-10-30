<script lang="ts" setup>
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, provide } from 'vue';

import { aiActivityStepGroupContext } from '../N8nAiActivityStep/context';
import N8nAiActivityStepButton from '../N8nAiActivityStepButton';
import N8nAiActivityStepChevron from '../N8nAiActivityStepChevron';
import N8nAnimatedCollapsibleContent from '../N8nAnimatedCollapsibleContent';

const props = withDefaults(
	defineProps<{
		/** Text in the disclosure header. */
		label?: string;
		/** Test identifier for the disclosure button. */
		headerTestId?: string;
		/** Announce label changes to assistive technology. Disable for streamed text. */
		announceLabel?: boolean;
		/** Control whether the group is open. Omit to use internal state. */
		open?: boolean;
		/** Set the initial open state when open is not controlled. */
		defaultOpen?: boolean;
		/** Show rails and indentation on child activity steps. */
		nested?: boolean;
		/** Size of the disclosure header. */
		size?: 'small' | 'medium';
		/** Show active work with the existing shimmer effect. */
		loading?: boolean;
		/** Stretch the header and reserve space for its trailing content. */
		fullWidth?: boolean;
		/** Place expanded content above or below the disclosure header. */
		contentPosition?: 'above' | 'below';
	}>(),
	{
		label: '',
		headerTestId: undefined,
		announceLabel: true,
		open: undefined,
		defaultOpen: false,
		nested: true,
		size: 'medium',
		loading: false,
		fullWidth: false,
		contentPosition: 'below',
	},
);

const emit = defineEmits<{
	/** Request a new open state when the disclosure is activated. */
	'update:open': [open: boolean];
}>();

defineSlots<{
	/** Content shown when the group is open. */
	default?: () => unknown;
	/** Content before the header label. */
	prefix?: () => unknown;
	/** Replace the header label with content that can use the open state. */
	label?: (props: { open: boolean }) => unknown;
	/** Content after the header label, before the chevron. */
	'header-trailing'?: (props: { open: boolean }) => unknown;
	/** Content shown outside the trigger only when the group is closed. */
	'collapsed-preview'?: () => unknown;
}>();

provide(
	aiActivityStepGroupContext,
	computed(() => props.nested),
);

function updateOpen(open: boolean) {
	emit('update:open', open);
}
</script>

<template>
	<CollapsibleRoot
		v-slot="{ open: isOpen }"
		:open="open"
		:default-open="defaultOpen"
		:class="{ [$style.contentAbove]: contentPosition === 'above' }"
		@update:open="updateOpen"
	>
		<CollapsibleTrigger as-child>
			<N8nAiActivityStepButton
				:size="size"
				:loading="loading"
				:full-width="fullWidth"
				aria-live="off"
				:data-test-id="headerTestId"
			>
				<template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
				<span :aria-live="announceLabel ? 'polite' : 'off'" aria-atomic="true">
					<slot name="label" :open="isOpen">{{ label }}</slot>
				</span>
				<template #suffix>
					<slot name="header-trailing" :open="isOpen" />
					<N8nAiActivityStepChevron
						:open="isOpen"
						:direction="contentPosition === 'above' ? 'down' : 'right'"
					/>
				</template>
			</N8nAiActivityStepButton>
		</CollapsibleTrigger>
		<N8nAnimatedCollapsibleContent :class="$style.content">
			<slot />
		</N8nAnimatedCollapsibleContent>
		<slot v-if="!isOpen" name="collapsed-preview" />
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.contentAbove {
	display: flex;
	flex-direction: column-reverse;
	align-items: flex-start;

	> .content {
		width: 100%;
	}
}
</style>
