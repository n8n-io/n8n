<script setup lang="ts">
import { Menu as ArkMenu } from '@ark-ui/vue/menu';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

// Also the content for a DropdownMenuSub: Ark UI's Menu.Positioner/Menu.Content
// render relative to whichever Menu.Root they're nested in, so this file works
// unchanged for a top-level menu or a submenu.
const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<Teleport to="body">
		<ArkMenu.Positioner>
			<ArkMenu.Content
				:class="
					cn(
						'z-50 min-w-40 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
						props.class,
					)
				"
			>
				<slot />
			</ArkMenu.Content>
		</ArkMenu.Positioner>
	</Teleport>
</template>
