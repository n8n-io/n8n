<script setup lang="ts">
import type { ProjectIcon } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';

// Follows `ProjectMembersIcon` in the self-healing module: a module cannot import another module,
// and the editor's `ProjectIcon` lives in the shell.
withDefaults(defineProps<{ icon?: ProjectIcon | null; size?: 'small' | 'medium' }>(), {
	icon: null,
	size: 'medium',
});

const iconSizes = { small: 'medium', medium: 'large' } as const;
</script>

<template>
	<span :class="[$style.icon, $style[size]]" aria-hidden="true" data-test-id="project-policy-icon">
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
		font-size: var(--font-size--lg);
	}
}
</style>
