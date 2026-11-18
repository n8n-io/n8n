<script setup lang="ts">
import { N8nHeading, N8nText } from '@n8n/design-system';

/**
 * A read-only panel under the orbs: the identity provider's picture, or an
 * upload once uploads are off. It fills the stage the way the drop zone does,
 * solid rather than dashed because nothing can be dropped on it, so the dialog
 * keeps its height whichever orb is chosen.
 */

defineProps<{
	heading: string;
	description: string;
}>();
</script>

<template>
	<div :class="$style.note">
		<div :class="$style.text">
			<N8nHeading size="medium" align="center">{{ heading }}</N8nHeading>
			<N8nText size="small" color="text-base" align="center">{{ description }}</N8nText>
		</div>
		<slot />
	</div>
</template>

<style lang="scss" module>
/* Spacing and type match the small empty state used as the drop zone. */
.note {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	min-height: var(--avatar-stage--min-height, 0);
	padding: var(--spacing--lg) var(--spacing--md);
	border-radius: var(--radius--lg);
	/* One step from the dialog's own background, recessed in both themes. */
	background: light-dark(var(--background--subtle), var(--background--surface));
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	max-width: 32rem;
}
</style>
