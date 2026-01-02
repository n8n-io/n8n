<script lang="ts" setup>
import CrdtTestContent from '../components/CrdtTestContent.vue';
import CrdtWorkflowProvider from '../components/CrdtWorkflowProvider.vue';
// import RestWorkflowProvider from '../components/RestWorkflowProvider.vue';

const workflowId = 'olaBF64OShV5q70u';
// const test = 'ser/Rj2O3ipqLBlwS11w';
</script>

<template>
	<div :class="$style.container">
		<CrdtWorkflowProvider :doc-id="workflowId">
			<CrdtTestContent />
		</CrdtWorkflowProvider>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: column;
	overflow: auto;
	background-color: var(--color--background--light-2);
}
</style>
