

<template>
	<div>hello</div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	props: {
		jsCode: {
			type: String,
		},
	},
	mounted() {
		console.log('mounted called!');
	},
});
</script>
