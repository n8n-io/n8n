<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import GoogleAuthButton from './GoogleAuthButton.vue';

defineProps<{
	isGoogleOAuthType: boolean;
}>();
const i18n = useI18n();
</script>

<template>
	<div :class="$style.container">
		<GoogleAuthButton v-if="isGoogleOAuthType" />
		<n8n-button
			v-else
			:label="i18n.baseText('credentialEdit.oAuthButton.connectMyAccount')"
			size="large"
		/>
	</div>
</template>

<style module lang="scss">
.container {
	display: inline-block;
}
</style>
