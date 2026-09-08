<script setup lang="ts">
import type { DropdownMenuRootEmits, DropdownMenuRootProps } from 'reka-ui';
import { DropdownMenuRoot, useForwardPropsEmits } from 'reka-ui';

const props = defineProps<DropdownMenuRootProps>();
const emits = defineEmits<DropdownMenuRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
	<DropdownMenuRoot v-slot="slotProps" data-slot="dropdown-menu" v-bind="forwarded">
		<slot v-bind="slotProps" />
	</DropdownMenuRoot>
</template>
