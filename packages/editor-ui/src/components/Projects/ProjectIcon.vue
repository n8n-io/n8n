<script setup lang="ts">
import type { ProjectIcon } from '@/types/projects.types';

type Props = {
	icon: ProjectIcon;
	size?: 'small' | 'medium' | 'large';
};

const props = withDefaults(defineProps<Props>(), {
	size: 'medium',
});
</script>
<template>
	<div :class="[$style.container, $style[`size-${props.size}`]]">
		<N8nIcon
			v-if="props.icon.type === 'icon'"
			:icon="props.icon.value"
			color="text-light"
		></N8nIcon>
		<N8nText v-else-if="icon.type === 'emoji'" color="text-light" :class="$style.emoji">
			{{ icon.value }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--color-foreground-light);
	border-radius: var(--border-radius-base);
}

.size-small {
	width: 24px;
	height: 24px;
}

.size-small {
	width: var(--spacing-l);
	height: var(--spacing-l);

	.emoji {
		font-size: var(--font-size-2xs);
	}
}

.size-medium {
	width: var(--spacing-xl);
	height: var(--spacing-xl);

	.emoji {
		font-size: var(--font-size-xs);
	}
}
</style>
