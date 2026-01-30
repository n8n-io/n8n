<script setup lang="ts">
import { computed } from 'vue';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AppSelectionCard from './AppSelectionCard.vue';
import type { AppEntry } from '../composables/useAppCredentials';

type CardState = 'default' | 'loading' | 'connected' | 'error';

const props = defineProps<{
	appEntries: AppEntry[];
	cardStates: Map<string, CardState>;
	searchQuery: string;
}>();

const emit = defineEmits<{
	'card-click': [appEntry: AppEntry];
}>();

const i18n = useI18n();

const filteredAppEntries = computed(() => {
	if (!props.searchQuery.trim()) {
		return props.appEntries;
	}

	const query = props.searchQuery.toLowerCase();
	return props.appEntries.filter((entry) => entry.app.displayName.toLowerCase().includes(query));
});

const getCardState = (entry: AppEntry): CardState => {
	return props.cardStates.get(entry.credentialType.name) ?? 'default';
};

const handleCardClick = (entry: AppEntry) => {
	emit('card-click', entry);
};
</script>

<template>
	<div :class="$style.container">
		<div v-if="filteredAppEntries.length === 0" :class="$style.emptyState">
			<N8nText color="text-light">
				{{ i18n.baseText('appSelection.noResults') }}
			</N8nText>
		</div>

		<div v-else :class="$style.grid">
			<AppSelectionCard
				v-for="entry in filteredAppEntries"
				:key="entry.app.name"
				:app="entry.app"
				:supports-instant-o-auth="entry.supportsInstantOAuth"
				:state="getCardState(entry)"
				@click="handleCardClick(entry)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
}

.grid {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
	justify-content: center;
	align-content: flex-start;
	min-height: 400px;
	max-height: 400px;
	overflow-y: auto;
	padding: var(--spacing--xs);
}

.emptyState {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: var(--spacing--2xl);
}
</style>
