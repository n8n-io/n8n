<script lang="ts" setup>
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { provide } from 'vue';

import { aiActivityStepGroupContext } from '../N8nAiActivityStep/context';
import N8nAiActivityStepButton from '../N8nAiActivityStepButton';
import N8nAiActivityStepChevron from '../N8nAiActivityStepChevron';
import N8nAnimatedCollapsibleContent from '../N8nAnimatedCollapsibleContent';
import N8nIcon from '../N8nIcon';

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
	<CollapsibleRoot v-slot="{ open: isOpen }">
		<N8nAnimatedCollapsibleContent v-if="contentPosition === 'above'">
			<slot />
		</N8nAnimatedCollapsibleContent>
		<CollapsibleTrigger as-child>
			<N8nAiActivityStepButton
				:size="size"
				:loading="loading"
				:full-width="fullWidth"
				:aria-live="$slots['header-trailing'] ? 'off' : 'polite'"
			>
				<template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
				{{ label }}
				<template #suffix>
					<slot name="header-trailing" />
					<N8nIcon
						v-if="contentPosition === 'above'"
						:icon="isOpen ? 'chevron-up' : 'chevron-down'"
						size="large"
						aria-hidden="true"
					/>
					<N8nAiActivityStepChevron v-else :open="isOpen" />
				</template>
			</N8nAiActivityStepButton>
		</CollapsibleTrigger>
		<N8nAnimatedCollapsibleContent v-if="contentPosition === 'below'">
			<slot />
		</N8nAnimatedCollapsibleContent>
	</CollapsibleRoot>
</template>
