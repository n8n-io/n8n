<script setup lang="ts">
import { Tooltip as ArkTooltip } from '@ark-ui/vue/tooltip';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<Teleport to="body">
		<ArkTooltip.Positioner>
			<ArkTooltip.Content
				:class="
					cn(
						'z-50 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md',
						props.class,
					)
				"
			>
				<slot />
			</ArkTooltip.Content>
		</ArkTooltip.Positioner>
	</Teleport>
</template>
