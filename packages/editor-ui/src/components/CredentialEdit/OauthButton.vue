<template>
	<span>
		<img
			v-if="isGoogleOAuthType"
			:src="basePath + 'google-signin-light.png'"
			:class="$style.googleIcon"
			:alt="$i18n2.baseText('credentialEdit.oAuthButton.signInWithGoogle')"
			@click.stop="$emit('click')"
		/>
		<n8n-button
			v-else
			:label="$i18n2.baseText('credentialEdit.oAuthButton.connectMyAccount')"
			size="large"
			@click.stop="$emit('click')"
		/>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';
import { renderText } from '../mixins/renderText';
import mixins from 'vue-typed-mixins';

export default mixins(renderText).extend({
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
