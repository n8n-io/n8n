<script setup lang="ts">
import type { ProjectIcon } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';

withDefaults(defineProps<{ icon?: ProjectIcon | null; size?: 'xsmall' | 'small' | 'medium' }>(), {
	icon: null,
	size: 'small',
});

const iconSizes = { xsmall: 'small', small: 'medium', medium: 'large' } as const;
</script>

<template>
	<span :class="[$style.icon, $style[size]]" aria-hidden="true" data-test-id="project-members-icon">
		<span v-if="icon?.type === 'emoji'" :class="$style.emoji">{{ icon.value }}</span>
		<N8nIcon
			v-else
			:icon="icon?.value ?? 'layers'"
			:color="icon?.color ?? 'text-base'"
			:size="iconSizes[size]"
		/>
	</span>
</template>

<style module lang="scss">
.icon {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius--full);
	background-color: var(--background--subtle);
}

.xsmall {
	width: var(--height--2xs);
	height: var(--height--2xs);

	.emoji {
		font-size: var(--font-size--3xs);
	}
}

.small {
	width: var(--height--sm);
	height: var(--height--sm);

	.emoji {
		font-size: var(--font-size--2xs);
	}
}

.medium {
	width: var(--height--xl);
	height: var(--height--xl);

	.emoji {
		font-size: var(--font-size--sm);
	}
}
</style>
