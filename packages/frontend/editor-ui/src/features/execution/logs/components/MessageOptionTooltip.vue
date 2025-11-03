<script setup lang="ts">
import type { PropType } from 'vue';

import { N8nIcon, N8nTooltip } from '@n8n/design-system';
defineProps({
	placement: {
		type: String as PropType<'left' | 'right' | 'top' | 'bottom'>,
		default: 'top',
	},
});
</script>

<template>
	<div :class="$style.container">
		<N8nTooltip :placement="placement">
			<template #content>
				<slot />
			</template>
			<span :class="$style.icon">
				<N8nIcon icon="info" size="xsmall" />
			</span>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: inline-flex;
	align-items: center;
	margin: 0 var(--spacing--4xs);
}

.icon {
	color: var(--color--foreground--shade-1);
	cursor: help;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
