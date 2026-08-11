<script lang="ts" setup>
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { provide } from 'vue';

import { aiActivityStepGroupContext } from '../N8nAiActivityStep/context';
import N8nAiActivityStepButton from '../N8nAiActivityStepButton';
import N8nAiActivityStepChevron from '../N8nAiActivityStepChevron';
import N8nAnimatedCollapsibleContent from '../N8nAnimatedCollapsibleContent';

withDefaults(
	defineProps<{
		label: string;
		size?: 'small' | 'medium';
		loading?: boolean;
	}>(),
	{
		size: 'medium',
		loading: false,
	},
);

defineSlots<{
	default?: () => unknown;
}>();

provide(aiActivityStepGroupContext, true);
</script>

<template>
	<CollapsibleRoot v-slot="{ open: isOpen }">
		<CollapsibleTrigger as-child>
			<N8nAiActivityStepButton :size="size" :loading="loading">
				{{ label }}
				<template #suffix>
					<N8nAiActivityStepChevron :open="isOpen" />
				</template>
			</N8nAiActivityStepButton>
		</CollapsibleTrigger>
		<N8nAnimatedCollapsibleContent>
			<slot />
		</N8nAnimatedCollapsibleContent>
	</CollapsibleRoot>
</template>
