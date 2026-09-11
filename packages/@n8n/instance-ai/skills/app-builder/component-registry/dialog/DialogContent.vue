<script setup lang="ts">
import { Dialog as ArkDialog } from '@ark-ui/vue/dialog';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<Teleport to="body">
		<ArkDialog.Backdrop
			class="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
		/>
		<ArkDialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<ArkDialog.Content
				:class="
					cn(
						'relative grid w-full max-w-lg gap-4 rounded-lg border border-border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
						props.class,
					)
				"
			>
				<slot />
				<ArkDialog.CloseTrigger
					class="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<svg
						viewBox="0 0 24 24"
						class="size-4"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					<span class="sr-only">Close</span>
				</ArkDialog.CloseTrigger>
			</ArkDialog.Content>
		</ArkDialog.Positioner>
	</Teleport>
</template>
