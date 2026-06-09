<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';

defineProps<{ instanceUrl: string | null }>();

function signOut() {
	void window.electronAPI.signOut();
}
</script>

<template>
	<main :class="$style.body">
		<N8nText v-if="instanceUrl" color="text-light" size="small">{{ instanceUrl }}</N8nText>
		<N8nButton variant="outline" size="small" @click="signOut">Sign out</N8nButton>
	</main>
</template>

<style module>
.body {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xl);
	text-align: center;
}
</style>
