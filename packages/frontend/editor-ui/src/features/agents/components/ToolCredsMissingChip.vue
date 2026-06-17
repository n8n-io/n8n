<script setup lang="ts">
/**
 * Warning chip that surfaces a tool row's missing-credentials state.
 *
 * Shared between the Agent Tools modal (rectangular chip next to the gear
 * button) and the sidebar (pill-shaped button — the only affordance to fix
 * the tool when the gear is hidden). Both variants emit `click` so the
 * caller can route to the config modal.
 *
 * Kept handrolled because N8nButton doesn't expose a "warning" theme — the
 * available variants (solid/subtle/ghost/outline/destructive/success) don't
 * cover the amber-tint affordance product wants for missing-credentials.
 * Reassess if/when a warning variant lands in the design system.
 */
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

withDefaults(defineProps<{ variant?: 'rectangular' | 'pill' }>(), {
	variant: 'rectangular',
});

defineEmits<{ click: [] }>();

const i18n = useI18n();
</script>

<template>
	<button type="button" :class="[$style.chip, $style[variant]]" @click="$emit('click')">
		<N8nIcon icon="triangle-alert" :size="14" />
		<span>{{ i18n.baseText('agents.tools.addCredentials') }}</span>
	</button>
</template>

<style lang="scss" module>
.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	background-color: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
	border: none;
	cursor: pointer;

	&:hover {
		background-color: var(--color--warning--tint-1);
	}
}

.rectangular {
	border-radius: var(--radius);
	font-size: var(--font-size--xs);
}

.pill {
	border-radius: 99px;
	font-size: var(--font-size--2xs);
}
</style>
