<template>
	<div :class="[$style.container, 'executions-view-container']">
		<div :class="$style.wip">
			<p>
				<n8n-text size="large" :bold="true">This is the new Executions view</n8n-text>
			</p>
			<p>
				<n8n-icon icon="exclamation-triangle" color="danger" size="medium" />&nbsp;
				<n8n-text size="medium">It is still a work in progress</n8n-text>
			</p>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'executions-view',
});
</script>

<style module lang="scss">
.container {
	padding: 1em;
	display: flex;
	width: 100%;
	height: 100vh;
	align-items: center;
	justify-content: center;
}

.wip {
	text-align: center;
}

</style>
