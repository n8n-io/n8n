<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { N8nButton, N8nHeading, N8nInput, N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDebounce } from '@/app/composables/useDebounce';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsAppSelectionStore } from '../stores/credentialsAppSelection.store';
import { useAppCredentials, type AppEntry } from '../composables/useAppCredentials';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { ICredentialsDecrypted } from 'n8n-workflow';
import AppSelectionGrid from './AppSelectionGrid.vue';
import AppInstallModal from './AppInstallModal.vue';

const emit = defineEmits<{
	continue: [];
}>();

const i18n = useI18n();
const { debounce } = useDebounce();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const appSelectionStore = useCredentialsAppSelectionStore();
const usersStore = useUsersStore();

const { appEntries, isLoading } = useAppCredentials();

const APP_INSTALL_MODAL_KEY = 'appInstallModal';

const searchQuery = ref('');
// Using ref with Record for better Vue reactivity than reactive(new Set())
const invalidCredentials = ref<Record<string, boolean>>({});
const validatedCredentials = ref<Record<string, boolean>>({});
const isValidatingCredentials = ref(false);
const credentialsFetched = ref(false);
const pendingCredentialType = ref<string | null>(null);
const pendingCredentialId = ref<string | null>(null);
const appToInstall = ref<AppEntry | null>(null);

const firstName = computed(() => usersStore.currentUser?.firstName ?? '');
const isOwner = computed(() => usersStore.isInstanceOwner);

const gridLoading = computed(
	() => isLoading.value || !credentialsFetched.value || isValidatingCredentials.value,
);

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

const trackSearch = (query: string) => {
	if (query.trim()) {
		const filteredCount = appEntries.value.filter((entry) =>
			entry.app.displayName.toLowerCase().includes(query.toLowerCase()),
		).length;
		appSelectionStore.trackSearchPerformed(query, filteredCount);
	}
};
const debouncedTrackSearch = debounce(trackSearch, { debounceTime: 500 });

const handleSearchInput = (value: string) => {
	searchQuery.value = value;
	debouncedTrackSearch(value);
};

const handleCardClick = (appEntry: AppEntry) => {
	const { credentialType, installed } = appEntry;

	if (credentialType) {
		const existingCredential = credentialsStore.allCredentials.find(
			(c) => c.type === credentialType.name,
		);
		if (existingCredential) {
			// Track the credential being edited for re-validation on modal close
			pendingCredentialType.value = credentialType.name;
			pendingCredentialId.value = existingCredential.id;
			uiStore.openExistingCredential(existingCredential.id);
			return;
		}
	}

	if (!installed) {
		appToInstall.value = appEntry;
		uiStore.openModal(APP_INSTALL_MODAL_KEY);
		return;
	}

	if (!credentialType) {
		return;
	}

	openCredentialModal(credentialType.name);
};

const openCredentialModal = (credentialTypeName: string) => {
	credentialsCountBefore.value = credentialsStore.allCredentials.filter(
		(c) => c.type === credentialTypeName,
	).length;
	pendingCredentialType.value = credentialTypeName;
	pendingCredentialId.value = null; // null indicates creating new credential
	uiStore.openNewCredential(credentialTypeName, true);
};

const handleInstallModalClose = () => {
	uiStore.closeModal(APP_INSTALL_MODAL_KEY);
	appToInstall.value = null;
	(document.activeElement as HTMLElement)?.blur();
};

const handleNodeInstalled = (credentialTypeName: string) => {
	uiStore.closeModal(APP_INSTALL_MODAL_KEY);
	appToInstall.value = null;
	openCredentialModal(credentialTypeName);
};

const handleContinue = () => {
	const connectedApps = credentialsStore.allCredentials.map((credential) => ({
		credential_type: credential.type,
		is_valid: !invalidCredentials.value[credential.type],
	}));
	appSelectionStore.trackCompleted(connectedApps);
	emit('continue');
};

const credentialsCountBefore = ref(0);

// Clean up state when credentials are deleted
watch(
	() => credentialsStore.allCredentials,
	(credentials) => {
		const existingTypes = new Set(credentials.map((c) => c.type));

		for (const typeName of Object.keys(invalidCredentials.value)) {
			if (!existingTypes.has(typeName)) {
				delete invalidCredentials.value[typeName];
			}
		}

		for (const typeName of Object.keys(validatedCredentials.value)) {
			if (!existingTypes.has(typeName)) {
				delete validatedCredentials.value[typeName];
			}
		}
	},
	{ deep: true },
);

let wasModalOpenOnKeyDown = false;

const handleKeyDownCapture = (event: KeyboardEvent) => {
	if (event.key === 'Escape') {
		wasModalOpenOnKeyDown = Object.values(uiStore.isModalActiveById).some((isActive) => isActive);
	}
};

const handleKeyDown = (event: KeyboardEvent) => {
	if (event.key !== 'Escape' || !searchQuery.value) return;
	if (wasModalOpenOnKeyDown) return;
	searchQuery.value = '';
};

const validateCredential = async (credentialId: string, credentialTypeName: string) => {
	try {
		const credentialData = await credentialsStore.getCredentialData({ id: credentialId });

		if (credentialData && typeof credentialData.data === 'object') {
			// Check if this is an OAuth credential type
			const credentialType = credentialsStore.getCredentialTypeByName(credentialTypeName);
			const isOAuth = credentialType?.extends?.some((ext) =>
				['oAuth2Api', 'oAuth1Api', 'googleOAuth2Api', 'microsoftOAuth2Api'].includes(ext),
			);

			let isValid = false;
			if (isOAuth) {
				// For OAuth credentials, check if oauthTokenData exists (backend returns true when connected)
				isValid = Boolean(credentialData.data.oauthTokenData);
			} else {
				// For non-OAuth credentials, use the test endpoint
				const testResult = await credentialsStore.testCredential(
					credentialData as ICredentialsDecrypted,
				);
				isValid = testResult.status === 'OK';
			}

			if (isValid) {
				// Remove from invalid credentials if it was previously invalid
				const { [credentialTypeName]: _, ...rest } = invalidCredentials.value;
				invalidCredentials.value = rest;
			} else {
				invalidCredentials.value = { ...invalidCredentials.value, [credentialTypeName]: true };
			}
		}
	} catch {
		invalidCredentials.value = { ...invalidCredentials.value, [credentialTypeName]: true };
	} finally {
		validatedCredentials.value = { ...validatedCredentials.value, [credentialTypeName]: true };
	}
};

const validateExistingCredentials = async () => {
	try {
		const credentials = credentialsStore.allCredentials;
		const appCredentialTypes = new Set(
			appEntries.value.map((entry) => entry.credentialType?.name).filter(Boolean),
		);

		// Deduplicate by credential type to avoid race conditions when multiple
		// credentials of the same type run validation in parallel and overwrite
		// each other's results in invalidCredentials (keyed by type name).
		const seenTypes = new Set<string>();
		const credentialsToValidate = credentials.filter((c) => {
			if (!appCredentialTypes.has(c.type) || seenTypes.has(c.type)) return false;
			seenTypes.add(c.type);
			return true;
		});

		if (credentialsToValidate.length === 0) {
			return;
		}

		await Promise.all(
			credentialsToValidate.map(async (credential) => {
				await validateCredential(credential.id, credential.type);
			}),
		);
	} finally {
		isValidatingCredentials.value = false;
	}
};

onMounted(async () => {
	appSelectionStore.trackPageViewed();
	document.addEventListener('keydown', handleKeyDownCapture, true);
	document.addEventListener('keydown', handleKeyDown);
	await credentialsStore.fetchAllCredentials();
	credentialsFetched.value = true;
});

const hasValidatedOnLoad = ref(false);

// Wait for BOTH app entries to load AND credentials to be fetched before validating
watch(
	() => ({ loading: isLoading.value, fetched: credentialsFetched.value }),
	async ({ loading, fetched }) => {
		if (!loading && fetched && !hasValidatedOnLoad.value) {
			hasValidatedOnLoad.value = true;
			// Set validating state synchronously BEFORE the async validation
			// to prevent a gap where neither isLoading nor isValidatingCredentials is true
			isValidatingCredentials.value = true;
			try {
				await validateExistingCredentials();
			} catch {
				// Ensure loading state is cleared even on unexpected errors
				isValidatingCredentials.value = false;
			}
		}
	},
	{ immediate: true },
);

onUnmounted(() => {
	document.removeEventListener('keydown', handleKeyDownCapture, true);
	document.removeEventListener('keydown', handleKeyDown);
});

const isCredentialModalOpen = computed(() => uiStore.isModalActiveById[CREDENTIAL_EDIT_MODAL_KEY]);

watch(isCredentialModalOpen, async (isOpen, wasOpen) => {
	if (!isOpen && wasOpen && pendingCredentialType.value) {
		if (pendingCredentialId.value) {
			// Re-validate edited credential
			await validateCredential(pendingCredentialId.value, pendingCredentialType.value);
		} else {
			// Check if a new credential was created
			const credentialsOfType = credentialsStore.allCredentials.filter(
				(c) => c.type === pendingCredentialType.value,
			);

			if (credentialsOfType.length > credentialsCountBefore.value) {
				const newCredential = credentialsOfType[credentialsOfType.length - 1];
				await validateCredential(newCredential.id, pendingCredentialType.value);
			}
		}

		pendingCredentialType.value = null;
		pendingCredentialId.value = null;
	}
});
</script>

<template>
	<div :class="$style.container" data-test-id="app-selection-page">
		<AppInstallModal
			:app-entry="appToInstall"
			:modal-name="APP_INSTALL_MODAL_KEY"
			@close="handleInstallModalClose"
			@installed="handleNodeInstalled"
		/>
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
					<template #suffix>
						<N8nIcon
							v-if="searchQuery"
							icon="x"
							:class="$style.clearIcon"
							data-test-id="app-selection-search-clear"
							@click="searchQuery = ''"
						/>
					</template>
				</N8nInput>
			</div>

			<AppSelectionGrid
				:app-entries="appEntries"
				:invalid-credentials="invalidCredentials"
				:validated-credentials="validatedCredentials"
				:search-query="searchQuery"
				:loading="gridLoading"
				:is-owner="isOwner"
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

.clearIcon {
	cursor: pointer;
	color: var(--color--text--tint-1);
	transition: color 0.2s ease;

	&:hover {
		color: var(--color--text);
	}
}

.footer {
	margin-top: var(--spacing--xl);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
