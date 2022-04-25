<template>
	<img
		:src="basePath + 'n8n-logo.svg'"
		:class="$style.img"
		alt="n8n.io"
	/>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	computed: {
		basePath(): string {
			return this.$store.getters.getBaseUrl;
		},
	},
});
</script>

<style lang="scss" module>
.img {
	height: 32px;
}
</style>
