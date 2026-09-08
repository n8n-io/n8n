<script setup lang="ts">
import { useId } from 'vue';

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

const headerId = useId();
</script>

<template>
	<section
		:class="$style.panelContainer"
		:aria-labelledby="props.showHeader && props.header ? headerId : undefined"
	>
		<AgentPanelHeader
			v-if="props.showHeader && props.header"
			:header-id="headerId"
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
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	padding-block: var(--spacing--md);
	background-color: var(--background--surface);
	border-radius: var(--radius--lg);
	border: var(--border);
	box-shadow: var(--shadow--xs);
}
</style>
