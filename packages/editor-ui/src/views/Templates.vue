<template>
	<div class="view-root">
		<div class="view-wrapper">
			<div class>
				<h2 class="filters">filters</h2>

			</div>


		</div>

	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default {
	name: 'Templates',
};

</script>

<style scoped lang="scss">

.view-root {
	position: absolute;
	width: 100%;
	height: 100%;
	left: 0;
	top: 0;
	overflow: hidden;
}

.view-wrapper {
	position: fixed;
	width: 100%;
	height: 100%;
}

.filters {
	margin-top: 65px;
	margin-left: 65px;
}

</style>
