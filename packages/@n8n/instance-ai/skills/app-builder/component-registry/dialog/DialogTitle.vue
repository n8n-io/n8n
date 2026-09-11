<script setup lang="ts">
import { Dialog as ArkDialog } from '@ark-ui/vue/dialog';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkDialog.Title :class="cn('text-lg font-semibold', props.class)">
		<slot />
	</ArkDialog.Title>
</template>
