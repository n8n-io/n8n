<template>
	<button
		:class="$style.googleAuthBtn"
		:title="$locale.baseText('credentialEdit.oAuthButton.signInWithGoogle')"
		:style="googleAuthButtons"
	/>
</template>

<script lang="ts" setup>
import { useUIStore } from '@/stores/ui.store';
import { useRootStore } from '@/stores/root.store';

const { baseUrl } = useRootStore();
const type = useUIStore().appliedTheme === 'dark' ? '.dark.png' : '.png';
const googleAuthButtons = {
	'--google-auth-btn-normal': `url(${baseUrl}google-auth/normal${type}`,
	'--google-auth-btn-focus': `url(${baseUrl}google-auth/focus${type}`,
	'--google-auth-btn-pressed': `url(${baseUrl}google-auth/pressed${type}`,
	'--google-auth-btn-disabled': `url(${baseUrl}google-auth/disabled${type}`,
};
</script>

<style module lang="scss">
.googleAuthBtn {
	--google-auth-btn-height: 46px;
	cursor: pointer;
	border: none;
	padding: 0;
	background-image: var(--google-auth-btn-normal);
	background-repeat: no-repeat;
	background-color: transparent;
	background-size: 100% 100%;
	border-radius: 4px;
	height: var(--google-auth-btn-height);
	// We have to preserve exact google button ratio
	width: calc(var(--google-auth-btn-height) * 4.15217391);

	&:focus,
	&:hover {
		outline: none;
		background-image: var(--google-auth-btn-focus);
	}
	&:active {
		background-image: var(--google-auth-btn-pressed);
	}
	&:disabled {
		background-image: var(--google-auth-btn-disabled);
	}
}
</style>
