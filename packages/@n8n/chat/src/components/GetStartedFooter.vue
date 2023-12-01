<script setup lang="ts">
import { useI18n } from '@/composables';
import PoweredBy from '@/components/PoweredBy.vue';

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
