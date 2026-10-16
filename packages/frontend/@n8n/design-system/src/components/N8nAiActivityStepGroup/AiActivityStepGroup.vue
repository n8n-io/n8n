<script lang="ts" setup>
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { provide } from 'vue';

import { aiActivityStepGroupContext } from '../N8nAiActivityStep/context';
import N8nAiActivityStepButton from '../N8nAiActivityStepButton';
import N8nAiActivityStepChevron from '../N8nAiActivityStepChevron';
import N8nAnimatedCollapsibleContent from '../N8nAnimatedCollapsibleContent';

withDefaults(
	defineProps<{
		/** Text in the disclosure header. */
		label: string;
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
		size: 'medium',
		loading: false,
		fullWidth: false,
		contentPosition: 'below',
	},
);

defineSlots<{
	default?: () => unknown;
	prefix?: () => unknown;
	'header-trailing'?: () => unknown;
}>();

provide(aiActivityStepGroupContext, true);
</script>

<template>
	<CollapsibleRoot
		v-slot="{ open: isOpen }"
		:class="{ [$style.contentAbove]: contentPosition === 'above' }"
	>
		<CollapsibleTrigger as-child>
			<N8nAiActivityStepButton
				:size="size"
				:loading="loading"
				:full-width="fullWidth"
				aria-live="off"
			>
				<template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
				<span aria-live="polite" aria-atomic="true">{{ label }}</span>
				<template #suffix>
					<slot name="header-trailing" />
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
