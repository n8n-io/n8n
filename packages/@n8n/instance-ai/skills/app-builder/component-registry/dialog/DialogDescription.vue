<script setup lang="ts">
import { Dialog as ArkDialog } from '@ark-ui/vue/dialog';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkDialog.Description :class="cn('text-sm text-muted-foreground', props.class)">
		<slot />
	</ArkDialog.Description>
</template>
