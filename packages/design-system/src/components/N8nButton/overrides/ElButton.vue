<template>
	<n8n-button
		v-bind="$attrs"
		v-on="$listeners"
	>
		<slot/>
	</n8n-button>
</template>
<script lang="ts">
import Vue from 'vue';
import N8nButton from '../Button.vue';

export default Vue.extend({
	components: {
		N8nButton,
	},
});
</script>

