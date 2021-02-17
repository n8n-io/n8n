<template>
  <div>
    <div class="error-message">ERROR: {{error.message}}</div>
    <pre><code>{{error.stack}}</code></pre>
		<div>ABC IVAN</div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'NodeErrorView',
	props: [
		'error',
	],
	data () {
		return {
			showFullError: false,
		};
	},
	methods: {
		revealError() {
			this.showFullError = true;
		},
	},
});
</script>

<style scoped>
.error-message {
	color: #ff0000;
	font-weight: bold;
}
</style>
