<script setup lang="ts">
import AgentPanelHeader from './AgentPanelHeader.vue';

interface AgentPanelProps {
	header?: string;
	description?: string;
	showHeader?: boolean;
}

const props = withDefaults(defineProps<AgentPanelProps>(), {
	header: undefined,
	description: undefined,
	showHeader: true,
});
</script>

<template>
	<section :class="$style.panelContainer">
		<AgentPanelHeader
			v-if="props.showHeader && props.header"
			:title="props.header"
			:description="props.description"
		/>
		<slot />
	</section>
</template>

<style module lang="scss">
.panelContainer {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	padding-block: var(--spacing--md);
	background-color: var(--background--surface);
	border-radius: var(--radius--lg);
	border: var(--border);
	box-shadow: var(--shadow--xs);
}
</style>
