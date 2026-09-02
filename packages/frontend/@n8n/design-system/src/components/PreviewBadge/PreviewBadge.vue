<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';

defineOptions({ name: 'N8nPreviewBadge' });

withDefaults(
	defineProps<{
		size?: 'small' | 'medium';
		text?: string;
	}>(),
	{ size: 'small', text: undefined },
);

const { t } = useI18n();
</script>

<template>
	<N8nBadge variant="secondary" :class="[$style.preview, $style[size]]">
		{{ text ?? t('previewBadge.preview') }}
	</N8nBadge>
</template>

<style lang="scss" module>
.preview {
	--n8n-badge--border-color: transparent;
	--n8n-badge--height: auto;

	border: 0;

	:global(.n8n-text) {
		font-weight: var(--font-weight--bold);
		line-height: normal;
	}
}

.small {
	--n8n-badge--padding: var(--spacing--5xs) var(--spacing--4xs);

	:global(.n8n-text) {
		font-size: var(--font-size--3xs);
	}
}

.medium {
	--n8n-badge--padding: var(--spacing--4xs) var(--spacing--2xs);

	:global(.n8n-text) {
		font-size: var(--font-size--2xs);
	}
}
</style>
