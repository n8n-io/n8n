<template>
	<div :class="$style.container">
		<executions-sidebar />
		<div :class="$style.content">
			<keep-alive>
				<router-view name="executionPreview" />
			</keep-alive>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import ExecutionsSidebar from '@/components/ExecutionsView/ExecutionsSidebar.vue';

export default Vue.extend({
	name: 'executions-page',
	components: {
		ExecutionsSidebar,
	},
});
</script>

<style module lang="scss">

.container {
	display: flex;
	height: 100%;
}

.content {
	flex: 1;
}

</style>
