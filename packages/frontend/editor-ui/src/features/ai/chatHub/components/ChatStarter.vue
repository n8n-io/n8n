<script setup lang="ts">
import { useUsersStore } from '@/features/settings/users/users.store';
import { N8nHeading } from '@n8n/design-system';
import { computed } from 'vue';

defineProps<{ isMobileDevice: boolean }>();

const userStore = useUsersStore();

const greetings = computed(
	() => `Hello, ${userStore.currentUser?.firstName ?? userStore.currentUser?.fullName ?? 'User'}!`,
);
</script>

<template>
	<div :class="[$style.starter, { [$style.isMobileDevice]: isMobileDevice }]">
		<N8nHeading tag="h2" bold size="xlarge">
			{{ greetings }}
		</N8nHeading>
	</div>
</template>

<style lang="scss" module>
.starter {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xl);
}

.card {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	border: 1px solid var(--color--foreground);
	background: var(--color--background);
	border-radius: var(--radius--lg);
	text-align: left;
	cursor: pointer;
	transition:
		transform 0.06s ease,
		background 0.06s ease,
		border-color 0.06s ease;
}

.card:hover {
	border-color: var(--color--primary);
	background: rgba(124, 58, 237, 0.04);
}

.cardIcon {
	height: 100%;
	display: flex;
	align-items: center;
}

.cardText {
	display: grid;
	gap: 2px;
}
</style>
