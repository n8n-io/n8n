<script lang="ts">
import { cva, type VariantProps } from 'class-variance-authority';

export const badgeVariants = cva(
	'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-colors [&_svg]:pointer-events-none [&_svg]:size-3',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-primary-foreground',
				secondary: 'border-transparent bg-secondary text-secondary-foreground',
				destructive: 'border-transparent bg-destructive text-white',
				outline: 'border-border text-foreground',
			},
		},
		defaultVariants: { variant: 'default' },
	},
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;
</script>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = withDefaults(
	defineProps<{ variant?: BadgeVariants['variant']; class?: HTMLAttributes['class'] }>(),
	{ variant: 'default' },
);
</script>

<template>
	<span :class="cn(badgeVariants({ variant }), props.class)">
		<slot />
	</span>
</template>
