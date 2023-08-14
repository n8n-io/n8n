<template>
	<div :class="$style.container">
		<GoogleAuthButton v-if="isGoogleOAuthType" @click="$emit('click')" />
		<n8n-button
			v-else
			:label="$locale.baseText('credentialEdit.oAuthButton.connectMyAccount')"
			size="large"
			@click.stop="$emit('click')"
		/>
	</div>
</template>

<script lang="ts" setup>
import GoogleAuthButton from './GoogleAuthButton.vue';

defineProps<{
	isGoogleOAuthType: boolean;
}>();
</script>

<style module lang="scss">
.container {
	display: inline-block;
}
</style>
