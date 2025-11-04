<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
	<div id="admin-panel">
		<RouterView />
	</div>
</template>

<style>
* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

body {
	font-family: var(--font-family);
	background-color: var(--color--background);
	color: var(--color--text);
}

#admin-panel {
	min-height: 100vh;
}
</style>
