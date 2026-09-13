<script setup lang="ts">
import { useId } from 'vue';

import AgentPanelHeader from './AgentPanelHeader.vue';

interface AgentPanelProps {
	header: string;
	description?: string;
	headerVisibility?: 'visible' | 'visually-hidden';
	containerClass?: string;
}

const props = withDefaults(defineProps<AgentPanelProps>(), {
	description: undefined,
	headerVisibility: 'visible',
});

const headerId = useId();
</script>

<template>
	<section :class="[$style.panelContainer, props.containerClass]" :aria-labelledby="headerId">
		<AgentPanelHeader
			:header-id="headerId"
			:title="props.header"
			:header-visibility="props.headerVisibility"
			:description="props.description"
		>
			<template v-if="$slots['header-actions']" #actions>
				<slot name="header-actions" />
			</template>
		</AgentPanelHeader>
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
