<script setup lang="ts">
import type { Suggestion } from '@/features/chatHub/chat.types';
import { SUGGESTIONS } from '@/features/chatHub/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { N8nHeading, N8nText } from '@n8n/design-system';
import Logo from '@n8n/design-system/components/N8nLogo/Logo.vue';
import { computed } from 'vue';

defineProps<{ isMobileDevice: boolean }>();

const emit = defineEmits<{
	select: [Suggestion];
}>();

const userStore = useUsersStore();
const settingsStore = useSettingsStore();

const greetings = computed(
	() =>
		`Good morning, ${userStore.currentUser?.firstName ?? userStore.currentUser?.fullName ?? 'User'}!`,
);
</script>

<template>
	<div :class="[$style.starter, { [$style.isMobileDevice]: isMobileDevice }]">
		<Logo size="large" :release-channel="settingsStore.settings.releaseChannel" />

		<div :class="$style.header">
			<N8nHeading tag="h2" bold size="xlarge">
				{{ greetings }}
			</N8nHeading>
		</div>

		<div :class="$style.suggestions">
			<button
				v-for="suggestion in SUGGESTIONS"
				:key="suggestion.title"
				type="button"
				:class="$style.card"
				@click="emit('select', suggestion)"
			>
				<div :class="$style.cardIcon" aria-hidden="true">
					<N8nText size="xlarge">{{ suggestion.icon }}</N8nText>
				</div>
				<div :class="$style.cardText">
					<N8nText bold color="text-dark">{{ suggestion.title }}</N8nText>
					<N8nText color="text-base">{{ suggestion.subtitle }}</N8nText>
				</div>
			</button>
		</div>
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

.suggestions {
	display: grid;
	grid-template-columns: repeat(2, minmax(220px, 1fr));
	gap: var(--spacing--md);
	width: min(960px, 90%);

	.isMobileDevice & {
		grid-template-columns: 1fr;
	}
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
