<script setup lang="ts">
defineOptions({ name: 'AgentBuilderTabPanel' });
</script>

<template>
	<div :class="$style.tabPanel">
		<slot />
	</div>
</template>

<style lang="scss" module>
.tabPanel {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--lg);
	box-sizing: border-box;
	width: 100%;
	min-height: 0;
	padding: var(--spacing--lg);
	margin: 0 auto;
}
</style>
