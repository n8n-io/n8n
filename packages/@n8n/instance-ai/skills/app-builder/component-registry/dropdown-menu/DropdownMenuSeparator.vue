<script setup lang="ts">
import { Menu as ArkMenu } from '@ark-ui/vue/menu';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkMenu.Separator :class="cn('-mx-1 my-1 h-px bg-border', props.class)" />
</template>
