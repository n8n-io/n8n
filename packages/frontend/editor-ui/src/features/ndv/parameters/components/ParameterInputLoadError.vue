<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

/**
 * Rendered in place of a module-contributed input whose chunk failed to load.
 *
 * Without it `defineAsyncComponent` renders nothing, so the field disappears
 * from the panel and the load rejection escapes as an uncaught error. Keeping
 * the row occupied is the point: a missing field reads as "this node has no
 * such parameter", which is worse than a visible failure.
 *
 * A stale chunk after a deploy is normally recovered by the app-level
 * `vite:preloadError` handler, which reloads the page once per 10s. This state
 * is what remains when that reload was throttled or did not help, so the offer
 * here is a manual reload rather than a second automatic one.
 *
 * The shell passes `ParameterInputProps` to whatever occupies the input slot;
 * this component needs none of them, so they are dropped rather than landing on
 * the DOM as attributes.
 */
defineOptions({ inheritAttrs: false });

const i18n = useI18n();

function reload() {
	window.location.reload();
}
</script>

<template>
	<div :class="$style.container" role="alert" data-test-id="parameter-input-load-error">
		<N8nIcon :class="$style.icon" icon="triangle-alert" size="small" color="danger" />
		<N8nText :class="$style.message" size="small" color="danger">
			{{ i18n.baseText('parameterInput.loadFailed') }}
		</N8nText>
		<N8nButton variant="subtle" size="mini" @click="reload">
			{{ i18n.baseText('parameterInput.loadFailed.reload') }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: var(--height--lg);
}

.icon {
	flex-shrink: 0;
}

.message {
	flex-grow: 1;
}
</style>
