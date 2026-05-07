<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
</script>

<template>
	<div :class="$style.logoRow" data-test-id="mcp-tile-logo-row" aria-hidden="true">
		<span :class="$style.logoChip">
			<N8nIcon icon="anthropic" :class="$style.anthropicIcon" />
		</span>
		<span :class="$style.logoChip">
			<svg
				:class="$style.openAiIcon"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M12 3.25a3.4 3.4 0 0 1 3.29 2.53 3.42 3.42 0 0 1 4.19 4.65 3.42 3.42 0 0 1-1.44 5.39 3.4 3.4 0 0 1-5.05 3.87 3.42 3.42 0 0 1-5.5-1.44 3.4 3.4 0 0 1-3.24-5.08 3.42 3.42 0 0 1 1.55-5.42A3.4 3.4 0 0 1 12 3.25Zm0 1.7a1.7 1.7 0 0 0-1.54.98l3.6 2.08 1.53-.88A1.7 1.7 0 0 0 14 4.95Zm-3.58 2.2a1.7 1.7 0 0 0-1.19 2.87v4.16l1.5.86V9.1l5.14 2.96v-1.73Zm8.5 1.42-3.6 2.08v1.72l5.13-2.96a1.7 1.7 0 0 0-1.54-.84Zm1.54 4.47-3.6 2.08-1.5-.86 5.13-2.96a1.7 1.7 0 0 1-.03 1.74Zm-8.32 2.9v1.73a1.7 1.7 0 0 0 3.4.03Zm-4.6-1.03a1.7 1.7 0 0 0 1.55.52l3.6-2.08v-1.72Z"
					fill="currentColor"
				/>
			</svg>
		</span>
	</div>
</template>

<style lang="scss" module>
.logoRow {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
}

.logoChip {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	color: var(--icon-color--strong);
	box-shadow: var(--box-shadow--light);
}

.anthropicIcon,
.openAiIcon {
	width: 20px;
	height: 20px;
}
</style>
