<script setup lang="ts">
import AgentPanelHeader from './AgentPanelHeader.vue';

interface AgentPanelProps = {
  header:string;
  description?:string;
  showHeader?:boolean;
}

const props = withDefaults(defineProps<AgentPanelProps>({
  showHeader:true;
}))
</script>

<template>
	<section class="$style.panelContainer">
		<AgentPanelHeader
			v-if="props.showHeader"
			:title="props.header"
			:description="props.description"
		/>
		<div class="$style.panel">
			<slot />
		</div>
	</section>
</template>

<style module lang="scss">
.panelContainer {
	display: flex;
	flex-direction: flex-column;
}
.panel {
	background-color: var(--background--surface);
	border-radius: var(--radius);
	border: var(--border);
	box-shadow: var(--shadow--xs);
}
</style>
