<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { sublimeSearch } from '@n8n/utils/search/sublimeSearch';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { removePreviewToken } from '@/features/shared/nodeCreator/nodeCreator.utils';
import AppSelectionCard from './AppSelectionCard.vue';
import type { AppEntry } from '../composables/useAppCredentials';

type CardState = 'default' | 'loading' | 'connected' | 'error';

const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();

const SKELETON_COUNT = 20;
const ICONS_TO_PRELOAD = 20;
const SEARCH_KEYS = [{ key: 'app.displayName', weight: 1 }];
const MIN_SEARCH_SCORE = 0;

const props = defineProps<{
	appEntries: AppEntry[];
	invalidCredentials: Record<string, boolean>;
	validatedCredentials: Record<string, boolean>;
	searchQuery: string;
	loading?: boolean;
	isOwner?: boolean;
}>();

const emit = defineEmits<{
	'card-click': [appEntry: AppEntry];
}>();

const i18n = useI18n();

const hasCredential = (entry: AppEntry): boolean => {
	if (!entry.credentialType) return false;
	return credentialsStore.allCredentials.some((c) => c.type === entry.credentialType?.name);
};

const sortConnectedFirst = (entries: AppEntry[]): AppEntry[] => {
	return [...entries].sort((a, b) => {
		const aConnected = hasCredential(a);
		const bConnected = hasCredential(b);
		if (aConnected && !bConnected) return -1;
		if (!aConnected && bConnected) return 1;
		return 0;
	});
};

const filteredAppEntries = computed(() => {
	if (!props.searchQuery.trim()) {
		return sortConnectedFirst(props.appEntries);
	}

	const searchResults = sublimeSearch(props.searchQuery, props.appEntries, SEARCH_KEYS);
	const filtered = searchResults
		.filter(({ score }) => score >= MIN_SEARCH_SCORE)
		.map(({ item }) => item);
	return sortConnectedFirst(filtered);
});

const getCardState = (entry: AppEntry): CardState => {
	if (hasCredential(entry)) {
		return 'connected';
	}
	return 'default';
};

const isCredentialInvalid = (entry: AppEntry): boolean => {
	const key = entry.credentialType?.name ?? entry.app.name;
	const hasExistingCredential = hasCredential(entry);

	if (props.invalidCredentials[key]) {
		return true;
	}
	if (hasExistingCredential && !props.validatedCredentials[key]) {
		return true;
	}
	return false;
};

const isCredentialValidated = (entry: AppEntry): boolean => {
	const key = entry.credentialType?.name ?? entry.app.name;
	return props.validatedCredentials[key] || hasCredential(entry);
};

const handleCardClick = (entry: AppEntry) => {
	emit('card-click', entry);
};

const iconsLoaded = ref(false);

const getIconUrl = (entry: AppEntry): string | null => {
	const { app } = entry;

	const nodeType = nodeTypesStore.getNodeType(app.name);
	if (nodeType?.iconUrl) {
		return typeof nodeType.iconUrl === 'string' ? nodeType.iconUrl : nodeType.iconUrl.light;
	}

	const cleanedName = removePreviewToken(app.name);
	const communityNode = nodeTypesStore.communityNodeType(cleanedName);
	if (communityNode?.nodeDescription?.iconUrl) {
		const iconUrl = communityNode.nodeDescription.iconUrl;
		return typeof iconUrl === 'string' ? iconUrl : iconUrl.light;
	}

	if (app.iconUrl) {
		return app.iconUrl;
	}

	return null;
};

const preloadIcons = async (entries: AppEntry[]) => {
	const iconsToLoad = entries.slice(0, ICONS_TO_PRELOAD);
	const iconUrls = iconsToLoad.map(getIconUrl).filter((url): url is string => url !== null);

	if (iconUrls.length === 0) {
		iconsLoaded.value = true;
		return;
	}

	const loadPromises = iconUrls.map(async (url) => {
		await new Promise<void>((resolve) => {
			const img = new Image();
			img.onload = () => resolve();
			img.onerror = () => resolve();
			img.src = url;
		});
	});

	await Promise.all(loadPromises);
	iconsLoaded.value = true;
};

watch(
	() => ({ entries: props.appEntries, loading: props.loading }),
	async ({ entries, loading }, oldValue) => {
		// Reset icons loaded state when entries change
		if (oldValue && entries !== oldValue.entries) {
			iconsLoaded.value = false;
		}
		if (entries.length > 0 && !loading && !iconsLoaded.value) {
			await preloadIcons(entries);
		}
	},
	{ immediate: true },
);

const isLoading = computed(
	() => props.loading || (!iconsLoaded.value && props.appEntries.length > 0),
);
</script>

<template>
	<div :class="$style.container">
		<div v-if="isLoading" :class="$style.grid">
			<AppSelectionCard v-for="i in SKELETON_COUNT" :key="`skeleton-${i}`" skeleton />
		</div>

		<div v-else-if="filteredAppEntries.length === 0" :class="$style.emptyState">
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
				:installed="entry.installed"
				:show-warning="isCredentialInvalid(entry)"
				:show-badge="isCredentialValidated(entry)"
				:is-owner="isOwner"
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
	scrollbar-width: none;
	-ms-overflow-style: none;

	&::-webkit-scrollbar {
		display: none;
	}
}

.emptyState {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: var(--spacing--2xl);
}
</style>
