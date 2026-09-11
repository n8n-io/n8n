<script setup lang="ts">
import { Tabs as ArkTabs } from '@ark-ui/vue/tabs';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ value: string; class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkTabs.Content :value="props.value" :class="cn('flex-1 outline-none', props.class)">
		<slot />
	</ArkTabs.Content>
</template>
