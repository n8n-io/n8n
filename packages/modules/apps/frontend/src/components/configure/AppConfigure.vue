<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';

import AppConfigureGeneral from './AppConfigureGeneral.vue';

defineProps<{ app: AppResponse }>();

const emit = defineEmits<{ updated: [app: AppResponse] }>();
</script>

<template>
	<div :class="$style.configure" data-test-id="app-view-configure">
		<AppConfigureGeneral :app="app" @updated="emit('updated', $event)" />
	</div>
</template>

<style lang="scss" module>
.configure {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	max-width: 56rem;
	margin-inline: auto;
	padding-block: var(--spacing--xl);
}
</style>
