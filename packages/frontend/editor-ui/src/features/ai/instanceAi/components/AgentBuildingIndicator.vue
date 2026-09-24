<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div
		:class="$style.buildingIndicator"
		role="status"
		data-test-id="instance-ai-agent-building-indicator"
	>
		<N8nIcon icon="spinner" spin size="small" />
		<span :class="$style.buildingLabel">
			{{ i18n.baseText('instanceAi.agentPreview.building') }}
		</span>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.buildingIndicator {
	position: absolute;
	top: calc(var(--height--4xl) + var(--spacing--xs));
	left: 50%;
	transform: translateX(-50%);
	z-index: 10;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--background--surface);
	box-shadow: var(--shadow--sm);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
	pointer-events: none;
	white-space: nowrap;
}

.buildingLabel {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color--subtle) 30%,
		var(--background--surface) 70%
	);
	--animation--shimmer--foreground: var(--text-color--subtle);
	@include motion.shimmer;
}
</style>

<style lang="scss">
.agent-building-indicator-enter-from,
.agent-building-indicator-leave-to {
	opacity: 0;
	transform: translate(-50%, -4px);
}

.agent-building-indicator-enter-active {
	transition: all 0.2s ease-out;
}

.agent-building-indicator-leave-active {
	transition: all 0.15s ease-in;
}
</style>
