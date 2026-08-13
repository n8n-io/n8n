<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.overlay" data-test-id="files-drop-overlay">
		<div :class="$style.inner">
			<N8nIcon icon="file-down" size="xlarge" :class="$style.icon" />
			<N8nText size="large" bold>{{ i18n.baseText('files.upload.dropOverlay') }}</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.overlay {
	position: absolute;
	inset: 0;
	z-index: 10;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--sm);
	background-color: var(--color--background--light-2);
	opacity: 0.95;
	// Let the drop event fall through to the view root handler
	pointer-events: none;
}

.inner {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	width: 100%;
	height: 100%;
	border: 2px dashed var(--color--primary);
	border-radius: var(--radius--lg);
	color: var(--color--primary);
}

.icon {
	color: var(--color--primary);
}
</style>
