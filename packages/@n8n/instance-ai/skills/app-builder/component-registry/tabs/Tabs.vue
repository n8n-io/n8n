<script setup lang="ts">
import { Tabs as ArkTabs } from '@ark-ui/vue/tabs';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const model = defineModel<string>();
const props = defineProps<{ defaultValue?: string; class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkTabs.Root
		v-model="model"
		:default-value="props.defaultValue"
		:class="cn('flex flex-col gap-2', props.class)"
	>
		<slot />
	</ArkTabs.Root>
</template>
