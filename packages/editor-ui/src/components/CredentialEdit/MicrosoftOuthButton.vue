<template>
	<button
		:class="$style.microsoftAuthBtn"
		:title="$locale.baseText('credentialEdit.oAuthButton.signInWithMicrosoft')"
		@click.stop.prevent="$emit('click')"
		:style="microsoftAuthButtons"
	/>
</template>

<script lang="ts" setup>
import { useRootStore } from '@/stores/n8nRootStore';

const { baseUrl } = useRootStore();
const microsoftAuthButtons = {
	'--microsoft-auth-btn-normal': `url(${baseUrl}microsoft-auth/normal.png`,
};
</script>

<style module lang="scss">
.microsoftAuthBtn {
	--microsoft-auth-btn-height: 46px;
	cursor: pointer;
	border: none;
	padding: 0;
	background-image: var(--microsoft-auth-btn-normal);
	background-repeat: no-repeat;
	background-color: transparent;
	background-size: 100% 100%;
	border-radius: 4px;
	height: var(--microsoft-auth-btn-height);
	// We have to preserve exact microsoft button ratio
	width: calc(var(--microsoft-auth-btn-height) * 4.15217391);
}
</style>
