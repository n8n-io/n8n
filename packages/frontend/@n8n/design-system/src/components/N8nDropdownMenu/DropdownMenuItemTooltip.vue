<script setup lang="ts">
import { Primitive } from 'reka-ui';

import N8nTooltip from '../N8nTooltip';

defineOptions({ name: 'N8nDropdownMenuItemTooltip' });

/**
 * Wraps a menu item in a tooltip when there is content. Without content it renders the item as is.
 * The tooltip opens to the left, outside the menu, so it does not cover the other items.
 */
defineProps<{ content?: string }>();
</script>

<template>
	<N8nTooltip v-if="content" :content="content" placement="left" :offset="10" as-child>
		<slot />
	</N8nTooltip>
	<Primitive v-else as-child>
		<slot />
	</Primitive>
</template>
