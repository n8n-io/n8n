<script setup lang="ts">
import { Tabs as ArkTabs } from '@ark-ui/vue/tabs';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkTabs.List
		:class="
			cn('inline-flex w-fit items-center justify-center rounded-lg bg-muted p-[3px]', props.class)
		"
	>
		<slot />
	</ArkTabs.List>
</template>
