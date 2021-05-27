<template>
	<div class="wrapper">
		<div class="scroll">
			<div class="content">
				<slot></slot>
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

export default Vue.extend(
	{
		name: 'PageContentWrapper',
	},
);

</script>

<style scoped>
.wrapper {
	padding-top: 40px;
	position: absolute;
	width: 100%;
	height: calc(100% - 40px);
}
.scroll {
	overflow-y: auto;
	width: 100%;
	height: 100%;
}
.content {
	padding: 1em;
	height: 100%;
}
</style>
