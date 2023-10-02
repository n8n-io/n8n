<script setup lang="ts">
import Button from '@/components/Button.vue';
import { useI18n } from '@/composables';

const { t } = useI18n();
</script>
<template>
	<div class="chat-get-started">
		<Button @click="$emit('click:button')">
			{{ t('getStarted') }}
		</Button>
	</div>
</template>

<style lang="scss">
.chat-get-started {
	padding-top: var(--chat--spacing);
	padding-bottom: var(--chat--spacing);
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100%;
}
</style>
