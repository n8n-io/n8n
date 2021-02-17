<template>
  <div>
    <div class="error-message">ERROR: {{error.message}}</div>
		<div>TEMP - 'showFullError' state: {{ showFullError }}</div>
		<div v-if="showFullError">
    	<pre><code>{{error.stack}}</code></pre>
		</div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'NodeErrorView',
	props: [
		'error',
		'showFullError',
	],
});
</script>

<style scoped>
.error-message {
	color: #ff0000;
	font-weight: bold;
}
</style>
