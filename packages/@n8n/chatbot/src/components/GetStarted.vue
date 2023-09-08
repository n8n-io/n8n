<script setup lang="ts">
import Button from '@/components/Button.vue';
import { useI18n } from '@/composables';

const { t } = useI18n();
</script>
<template>
	<div class="chat-get-started">
		<Button @click="$emit('click:button')">
			{{ t('button') }}
		</Button>
	</div>
</template>
