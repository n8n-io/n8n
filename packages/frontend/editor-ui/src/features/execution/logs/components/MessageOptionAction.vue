<script setup lang="ts">
import { useAttrs } from 'vue';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

import { N8nIcon, N8nTooltip } from '@n8n/design-system';
defineProps<{ label: string; icon: IconName; placement: 'left' | 'right' | 'top' | 'bottom' }>();

const attrs = useAttrs();

const onClick = () => {
	// @ts-expect-error Attrs onClick is not typed
	attrs.onClick?.();
};
</script>

<template>
	<div :class="$style.container">
		<N8nTooltip :placement="placement">
			<template #content>
				{{ label }}
			</template>
			<N8nIcon :class="$style.icon" :icon="icon" size="xsmall" @click="onClick" />
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
	cursor: pointer;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
