<template>
	<span>
		<img
			v-if="isGoogleOAuthType"
			:src="basePath + 'google-signin-light.png'"
			:class="$style.googleIcon"
			alt="Sign in with Google"
			@click.stop="$emit('click')"
		/>
		<n8n-button
			v-else
			label="Connect my account"
			size="large"
			@click.stop="$emit('click')"
		/>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	props: {
		isGoogleOAuthType: {
			type: Boolean,
		},
	},
	computed: {
		basePath(): string {
			return this.$store.getters.getBaseUrl;
		},
	},
});
</script>

<style module lang="scss">
.googleIcon {
	width: 191px;
	cursor: pointer;
}
</style>
