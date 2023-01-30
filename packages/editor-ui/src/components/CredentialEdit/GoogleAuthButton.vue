<template>
	<button
		:class="$style.googleAuthBtn"
		:title="$locale.baseText('credentialEdit.oAuthButton.signInWithGoogle')"
		@click.stop.prevent="$emit('click')"
		:style="googleAuthButtons"
	/>
</template>

<script lang="ts" setup>
import { useRootStore } from '@/stores/n8nRootStore';

const { baseUrl } = useRootStore();
const googleAuthButtons = {
	'--google-auth-btn-normal': `url(${baseUrl}google-auth/normal.png`,
	'--google-auth-btn-focus': `url(${baseUrl}google-auth/focus.png`,
	'--google-auth-btn-pressed': `url(${baseUrl}google-auth/pressed.png`,
	'--google-auth-btn-disabled': `url(${baseUrl}google-auth/disabled.png`,
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
