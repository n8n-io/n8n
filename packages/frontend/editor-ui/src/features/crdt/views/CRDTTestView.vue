<script lang="ts" setup>
import { VueFlow } from '@vue-flow/core';
import CrdtWorkflowLoader from '../components/CrdtWorkflowLoader.vue';
</script>

<template>
	<div :class="$style.container">
		<CrdtWorkflowLoader :workflow-id="'olaBF64OShV5q70u'">
			<template #default="props">
				<VueFlow v-bind="props">
					<template #default>
						<button type="button">execute</button>
					</template>
				</VueFlow>
			</template>
			<template #error="{ error }">
				<h2>Error Loading CRDT Workflow</h2>
				<p>{{ error }}</p>
			</template>
		</CrdtWorkflowLoader>
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
