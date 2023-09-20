<script setup lang="ts">
import { useI18n } from '@/composables';
import { ref } from 'vue';

const { t, te } = useI18n();
const value = ref('');
</script>

<template>
	<div class="chat-input">
		<textarea v-model="value" rows="1" />
	</div>
</template>

<style lang="scss">
.chat-input {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;

	textarea {
		font-family: inherit;
		font-size: inherit;
		width: 100%;
		border: none;
		padding: var(--chat--spacing);
		resize: none;
	}
}
</style>
