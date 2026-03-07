<script setup lang="ts">
import { useUsersStore } from '@/features/settings/users/users.store';
import { computed } from 'vue';

import { N8nIcon, N8nText } from '@n8n/design-system';
export interface Props {
	hint: string;
}

const isAdminOrOwner = computed(() => useUsersStore().isAdminOrOwner);

defineProps<Props>();
</script>

<template>
	<div v-if="isAdminOrOwner" :class="$style.container">
		<N8nIcon color="text-light" icon="info" size="large" />
		<N8nText color="text-base" size="medium"> {{ hint }} </N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	margin: var(--spacing--sm);
	margin-top: 0;
	padding: var(--spacing--xs);
	border: var(--border-width) solid var(--color--foreground);
	border-radius: 0.25em;
	pointer-events: none;
	cursor: default;
}
</style>
