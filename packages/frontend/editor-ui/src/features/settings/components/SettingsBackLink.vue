<script lang="ts" setup>
import { useRouter, type RouteLocationRaw } from 'vue-router';
import { N8nButton, N8nIcon } from '@n8n/design-system';

/**
 * Back action for a settings page that predates `N8nSettingsLayout` and is listed on an
 * overview page (Authentication, Observability). Mirrors the layout's own back action.
 */
const props = defineProps<{
	label: string;
	to: RouteLocationRaw;
}>();

const router = useRouter();

async function goBack() {
	await router.push(props.to);
}
</script>

<template>
	<div :class="$style.backRow">
		<N8nButton
			variant="ghost"
			size="small"
			:class="$style.backButton"
			data-test-id="settings-back-link"
			@click="goBack"
		>
			<template #icon>
				<N8nIcon icon="arrow-left" />
			</template>
			{{ label }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.backRow {
	display: flex;
	margin-bottom: var(--spacing--lg);
}

.backButton {
	/* Pull the ghost button's inner padding so the arrow aligns with the page heading. */
	margin-inline-start: calc(-1 * var(--spacing--xs));
}
</style>
