<script lang="ts" setup>
import GoogleAuthButton from './GoogleAuthButton.vue';

defineProps<{
	isGoogleOAuthType: boolean;
}>();
</script>

<template>
	<div :class="$style.container">
		<GoogleAuthButton v-if="isGoogleOAuthType" />
		<n8n-button
			v-else
			:label="$locale.baseText('credentialEdit.oAuthButton.connectMyAccount')"
			size="large"
		/>
	</div>
</template>

<style module lang="scss">
.container {
	display: inline-block;
}
</style>
