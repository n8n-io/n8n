<script setup lang="ts">
import ClaudeIcon from '../assets/client-icons/claude.svg?component';
</script>

<template>
	<span :class="$style.logo" aria-hidden="true">
		<ClaudeIcon :class="$style.icon" />
	</span>
</template>

<style lang="scss" module>
.logo {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--mcp-agent-logo-size, calc(var(--spacing--lg) - var(--spacing--5xs)));
	height: var(--mcp-agent-logo-size, calc(var(--spacing--lg) - var(--spacing--5xs)));
	border-radius: var(--radius--sm);
	background: var(--background--surface);
	border: var(--border-width) solid var(--border-color--subtle);
}

.icon {
	width: var(--mcp-agent-logo-icon-size, calc(var(--spacing--sm) - var(--spacing--5xs)));
	height: var(--mcp-agent-logo-icon-size, calc(var(--spacing--sm) - var(--spacing--5xs)));
}
</style>
