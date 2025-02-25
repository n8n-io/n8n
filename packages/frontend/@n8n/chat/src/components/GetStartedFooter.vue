<script setup lang="ts">
import PoweredBy from '@n8n/chat/components/PoweredBy.vue';
import { useI18n } from '@n8n/chat/composables';

const { t, te } = useI18n();
</script>
<template>
	<div class="chat-get-started-footer">
		<div v-if="te('footer')">
			{{ t('footer') }}
		</div>
		<PoweredBy />
	</div>
</template>

<style lang="scss">
.chat-get-started-footer {
	padding: var(--chat--spacing);
}
</style>
