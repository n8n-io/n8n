<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { DialogClose } from 'reka-ui';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const props = withDefaults(
	defineProps<{
		class?: HTMLAttributes['class'];
		showCloseButton?: boolean;
	}>(),
	{
		showCloseButton: false,
	},
);
</script>

<template>
	<div
		data-slot="dialog-footer"
		:class="
			cn(
				'bg-muted/50 -mx-4 -mb-4 rounded-b-xl border-t p-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
				props.class,
			)
		"
	>
		<slot />
		<DialogClose v-if="showCloseButton" as-child>
			<Button variant="outline"> Close </Button>
		</DialogClose>
	</div>
</template>
