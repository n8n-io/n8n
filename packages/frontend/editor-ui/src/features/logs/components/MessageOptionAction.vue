<script setup lang="ts">
import type { PropType } from 'vue';
import { useAttrs } from 'vue';

defineProps({
	label: {
		type: String,
		required: true,
	},
	icon: {
		type: String,
		required: true,
	},
	placement: {
		type: String as PropType<'left' | 'right' | 'top' | 'bottom'>,
		default: 'top',
	},
});

const attrs = useAttrs();

const onClick = () => {
	// @ts-expect-error Attrs onClick is not typed
	attrs.onClick?.();
};
</script>

<template>
	<div :class="$style.container">
		<n8n-tooltip :placement="placement">
			<template #content>
				{{ label }}
			</template>
			<n8n-icon :class="$style.icon" :icon="icon" size="xsmall" @click="onClick" />
		</n8n-tooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: inline-flex;
	align-items: center;
	margin: 0 var(--spacing-4xs);
}

.icon {
	color: var(--color-foreground-dark);
	cursor: pointer;

	&:hover {
		color: var(--color-primary);
	}
}
</style>
