<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';

const { variant } = defineProps<{ variant: 1 | 2 }>();
const i18n = useI18n();
</script>

<template>
	<N8nTooltip placement="bottom">
		<template #content>
			<span v-n8n-html="i18n.baseText('node.thisIsATriggerNode')" />
		</template>
		<div :class="variant === 1 ? $style['triggerIcon-variant-1'] : $style['triggerIcon-variant-2']">
			<FontAwesomeIcon icon="bolt" size="lg" />
		</div>
	</N8nTooltip>
</template>

<style lang="scss" module>
.triggerIcon-variant-1 {
	display: inline;
	position: static;
	color: var(--color-primary);
	padding: var(--spacing-4xs);
}

.triggerIcon-variant-2 {
	position: absolute;
	right: 100%;
	margin: auto;
	color: var(--color-primary);
	padding: var(--spacing-s);
	animation: slide-in 0.2s ease forwards;

	:global(.hovered) & {
		animation: slide-out 0.2s ease forwards;
	}
}

@keyframes slide-in {
	from {
		translate: -12px 0;
		opacity: 0;
	}

	to {
		translate: 0 0;
		opacity: 1;
	}
}

@keyframes slide-out {
	from {
		translate: 0 0;
		opacity: 1;
	}

	to {
		translate: -12px 0;
		opacity: 0;
	}
}
</style>
