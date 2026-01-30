<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue';
import { N8nButton, N8nHeading, N8nInput, N8nText, N8nIcon, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDebounce } from '@/app/composables/useDebounce';
import { useTelemetry } from '@/app/composables/useTelemetry';
import {
	useCredentialsStore,
	listenForCredentialChanges,
} from '@/features/credentials/credentials.store';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsAppSelectionStore } from '../stores/credentialsAppSelection.store';
import { useAppCredentials, type AppEntry } from '../composables/useAppCredentials';
import { useUsersStore } from '@/features/settings/users/users.store';
import AppSelectionGrid from './AppSelectionGrid.vue';

type CardState = 'default' | 'loading' | 'connected' | 'error';

const emit = defineEmits<{
	continue: [];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const { debounce } = useDebounce();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const appSelectionStore = useCredentialsAppSelectionStore();
const usersStore = useUsersStore();

const { appEntries, isLoading } = useAppCredentials();

const searchQuery = ref('');
const cardStates = reactive(new Map<string, CardState>());
// Track which credential type is being created via modal (for non-OAuth flow)
const pendingCredentialType = ref<string | null>(null);

const firstName = computed(() => usersStore.currentUser?.firstName ?? '');

const heading = computed(() => {
	if (firstName.value) {
		return i18n.baseText('appSelection.heading', { interpolate: { name: firstName.value } });
	}
	return i18n.baseText('appSelection.heading.noName');
});

const continueButtonLabel = computed(() => {
	const count = appSelectionStore.connectedCount;
	if (count === 0) {
		return i18n.baseText('appSelection.continue');
	}
	return i18n.baseText('appSelection.continueWithCount', {
		interpolate: { count: String(count) },
	});
});

const trackSearch = (query: string, count: number) => {
	if (query.trim()) {
		appSelectionStore.trackSearchPerformed(query, count);
	}
};
const debouncedTrackSearch = debounce(trackSearch, { debounceTime: 500 });

const handleSearchInput = (value: string) => {
	searchQuery.value = value;
	const filteredCount = appEntries.value.filter((entry) =>
		entry.app.displayName.toLowerCase().includes(value.toLowerCase()),
	).length;
	debouncedTrackSearch(value, filteredCount);
};

const handleCardClick = (appEntry: AppEntry) => {
	const { credentialType } = appEntry;
	const currentState = cardStates.get(credentialType.name);

	if (currentState === 'loading' || currentState === 'connected') {
		return;
	}

	// Open the credential modal - it handles OAuth and manual setup consistently
	pendingCredentialType.value = credentialType.name;
	cardStates.set(credentialType.name, 'loading');
	uiStore.openNewCredential(credentialType.name, true);
};

const handleContinue = () => {
	appSelectionStore.trackCompleted();
	emit('continue');
};

// Listen for credential changes to handle manual flow completion
let unsubscribeCredentialChanges: (() => void) | undefined;

onMounted(() => {
	appSelectionStore.trackPageViewed();

	// Listen for credentials created via the modal
	unsubscribeCredentialChanges = listenForCredentialChanges({
		store: credentialsStore,
		onCredentialCreated: (credential) => {
			// Check if this matches our pending credential type
			if (pendingCredentialType.value && credential.type === pendingCredentialType.value) {
				cardStates.set(credential.type, 'connected');
				appSelectionStore.markCredentialConnected(credential.id);

				telemetry.track('User saved credentials', {
					credential_type: credential.type,
					credential_id: credential.id,
					source: 'app_selection',
					is_valid: true,
					flow: 'manual_setup',
				});

				pendingCredentialType.value = null;
			}
		},
	});
});

onUnmounted(() => {
	unsubscribeCredentialChanges?.();
});

// Watch for credential modal close to reset pending state if user didn't save
const isCredentialModalOpen = computed(() => uiStore.isModalActiveById[CREDENTIAL_EDIT_MODAL_KEY]);

watch(isCredentialModalOpen, (isOpen, wasOpen) => {
	// Modal just closed
	if (!isOpen && wasOpen && pendingCredentialType.value) {
		const state = cardStates.get(pendingCredentialType.value);
		// If still loading, user closed without saving - reset to default
		if (state === 'loading') {
			cardStates.set(pendingCredentialType.value, 'default');
		}
		pendingCredentialType.value = null;
	}
});
</script>

<template>
	<div :class="$style.container" data-test-id="app-selection-page">
		<div :class="$style.content">
			<N8nHeading tag="h1" size="xlarge" :class="$style.heading">
				{{ heading }}
			</N8nHeading>

			<N8nText :class="$style.subheading" color="text-light">
				{{ i18n.baseText('appSelection.subheading') }}
			</N8nText>

			<div :class="$style.searchContainer">
				<N8nInput
					:model-value="searchQuery"
					:placeholder="i18n.baseText('appSelection.searchPlaceholder')"
					size="large"
					data-test-id="app-selection-search"
					@update:model-value="handleSearchInput"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
			</div>

			<div v-if="isLoading" :class="$style.loadingContainer">
				<N8nLoading variant="p" :rows="3" />
			</div>

			<AppSelectionGrid
				v-else
				:app-entries="appEntries"
				:card-states="cardStates"
				:search-query="searchQuery"
				@card-click="handleCardClick"
			/>

			<div :class="$style.footer">
				<N8nButton
					v-if="appSelectionStore.connectedCount > 0"
					:label="continueButtonLabel"
					size="large"
					data-test-id="app-selection-continue"
					@click="handleContinue"
				/>
				<N8nButton
					v-else
					:label="i18n.baseText('appSelection.connectLater')"
					type="tertiary"
					size="large"
					data-test-id="app-selection-skip"
					@click="handleContinue"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	min-height: 100vh;
	padding: var(--spacing--2xl);
	padding-top: 10vh;
}

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	max-width: 800px;
	width: 100%;
}

.heading {
	margin-bottom: var(--spacing--xs);
	text-align: center;
}

.subheading {
	margin-bottom: var(--spacing--xl);
	text-align: center;
}

.searchContainer {
	width: 400px;
	min-width: 400px;
	margin-bottom: var(--spacing--lg);
}

.loadingContainer {
	width: 100%;
	padding: var(--spacing--2xl);
}

.footer {
	margin-top: var(--spacing--xl);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
