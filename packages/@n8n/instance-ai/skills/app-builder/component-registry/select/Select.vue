<script setup lang="ts">
import { createListCollection, Select as ArkSelect } from '@ark-ui/vue/select';
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';

import { cn } from '@/lib/utils';

// A single `items` prop plus a plain string v-model, instead of Ark UI's own
// manual collection + string[] value — Select is used often, so this trades
// a little flexibility (no custom trigger markup, no grouping) for an API an
// agent can call correctly every time. Need a custom trigger or groups? Ark
// UI's own parts (Select.Control/Trigger/Content/ItemGroup/...) are directly
// available from `@ark-ui/vue/select`, styled the same way as this file.
const props = defineProps<{
	items: Array<{ label: string; value: string }>;
	placeholder?: string;
	disabled?: boolean;
	class?: HTMLAttributes['class'];
}>();

// Bare v-model is a single value; Ark UI's own Select always models an array
// (it supports multi-select), so this wrapper narrows to the common case.
const model = defineModel<string | undefined>();
const collection = computed(() => createListCollection({ items: props.items }));
const values = computed<string[]>({
	get: () => (model.value === undefined ? [] : [model.value]),
	set: (next) => {
		model.value = next[0];
	},
});
</script>

<template>
	<ArkSelect.Root
		v-model="values"
		:collection="collection"
		:disabled="props.disabled"
		:class="cn('w-full', props.class)"
	>
		<ArkSelect.Control>
			<ArkSelect.Trigger
				class="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[placeholder]:text-muted-foreground"
			>
				<ArkSelect.ValueText :placeholder="props.placeholder ?? 'Select…'" />
				<svg
					viewBox="0 0 24 24"
					class="size-4 shrink-0 opacity-50"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</ArkSelect.Trigger>
		</ArkSelect.Control>
		<Teleport to="body">
			<ArkSelect.Positioner>
				<ArkSelect.Content
					class="z-50 max-h-60 min-w-32 overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
				>
					<ArkSelect.Item
						v-for="item in props.items"
						:key="item.value"
						:item="item"
						class="relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:font-medium"
					>
						<ArkSelect.ItemText>{{ item.label }}</ArkSelect.ItemText>
					</ArkSelect.Item>
				</ArkSelect.Content>
			</ArkSelect.Positioner>
		</Teleport>
	</ArkSelect.Root>
</template>
