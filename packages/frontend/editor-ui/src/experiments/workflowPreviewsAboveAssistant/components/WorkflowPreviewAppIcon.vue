<!-- Experiment cleanup (124_workflow_previews_above_assistant) -->
<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, type IconName } from '@n8n/design-system';

import { getPreviewIcon } from '../icons';

const props = withDefaults(
	defineProps<{
		icon: string;
		size?: 'small' | 'medium';
	}>(),
	{ size: 'small' },
);

const preview = computed(() => getPreviewIcon(props.icon));
const iconName = computed(() =>
	preview.value.icon.type === 'icon' ? (preview.value.icon.name as IconName) : undefined,
);
const iconStyle = computed(() =>
	preview.value.iconColor
		? { color: `var(--node--icon--color--${preview.value.iconColor})` }
		: undefined,
);
</script>

<template>
	<span
		:class="[$style.icon, size === 'medium' && $style.medium]"
		:style="iconStyle"
		aria-hidden="true"
	>
		<N8nIcon v-if="iconName" :icon="iconName" :size="size === 'medium' ? 18 : 14" />
		<img
			v-else-if="preview.icon.src"
			:src="preview.icon.src"
			alt=""
			:class="[$style.image, preview.icon.lightInvert && $style.lightInvert]"
		/>
	</span>
</template>

<style lang="scss" module>
.icon {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--color--background--light-3);
}

.image {
	width: var(--spacing--xs);
	height: var(--spacing--xs);
	object-fit: contain;
}

.medium {
	width: var(--spacing--xl);
	height: var(--spacing--xl);

	.image {
		width: var(--spacing--sm);
		height: var(--spacing--sm);
	}
}

.lightInvert {
	filter: invert(1);
}

:global([data-theme='dark']) .lightInvert {
	filter: none;
}

@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) .lightInvert {
		filter: none;
	}
}
</style>
