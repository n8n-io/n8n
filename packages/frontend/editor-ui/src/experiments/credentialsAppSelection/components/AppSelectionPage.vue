<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue';
import { N8nButton, N8nHeading, N8nInput, N8nText, N8nIcon, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
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
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import AppSelectionGrid from './AppSelectionGrid.vue';
import type { ICredentialType, CredentialInformation, ICredentialsDecrypted } from 'n8n-workflow';

type CardState = 'default' | 'loading' | 'connected' | 'error';

const emit = defineEmits<{
	continue: [];
}>();

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();
const { debounce } = useDebounce();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const appSelectionStore = useCredentialsAppSelectionStore();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();

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

const getParentTypes = (credentialType: ICredentialType): string[] => {
	const parents: string[] = [];
	let current = credentialType;

	while (current.extends) {
		parents.push(...current.extends);
		const parentType = current.extends.find((ext) => credentialsStore.getCredentialTypeByName(ext));
		if (parentType) {
			const parent = credentialsStore.getCredentialTypeByName(parentType);
			if (parent) {
				current = parent;
			} else {
				break;
			}
		} else {
			break;
		}
	}

	return parents;
};

const handleInstantOAuthFlow = async (appEntry: AppEntry) => {
	const { credentialType, app } = appEntry;
	cardStates.set(credentialType.name, 'loading');

	try {
		const credentialName = await credentialsStore.getNewCredentialName({
			credentialTypeName: credentialType.name,
		});

		const credentialData = {
			name: credentialName,
			type: credentialType.name,
			data: {} as Record<string, CredentialInformation>,
		};

		for (const property of credentialType.properties) {
			if (property.default !== undefined && property.default !== null) {
				credentialData.data[property.name] = property.default as CredentialInformation;
			}
		}

		const projectId = projectsStore.personalProject?.id;
		const credential = await credentialsStore.createNewCredential(
			credentialData as ICredentialsDecrypted,
			projectId,
			'app_selection',
		);

		const parentTypes = getParentTypes(credentialType);
		const isOAuth2 = credentialType.name === 'oAuth2Api' || parentTypes.includes('oAuth2Api');

		const credData = {
			id: credential.id,
			...credentialData.data,
			type: credentialType.name,
			name: credentialName,
		};

		let url: string;
		if (isOAuth2) {
			url = await credentialsStore.oAuth2Authorize(
				credData as Parameters<typeof credentialsStore.oAuth2Authorize>[0],
			);
		} else {
			url = await credentialsStore.oAuth1Authorize(
				credData as Parameters<typeof credentialsStore.oAuth1Authorize>[0],
			);
		}

		const params =
			'scrollbars=no,resizable=yes,status=no,titlebar=no,location=no,toolbar=no,menubar=no,width=500,height=700';
		const oauthPopup = window.open(url, 'OAuth Authorization', params);

		const oauthChannel = new BroadcastChannel('oauth-callback');

		const receiveMessage = (event: MessageEvent) => {
			const success = event.data === 'success';

			telemetry.track('User saved credentials', {
				credential_type: credentialType.name,
				credential_id: credential.id,
				app_name: app.displayName,
				source: 'app_selection',
				is_valid: success,
				flow: 'instant_oauth',
			});

			if (success) {
				cardStates.set(credentialType.name, 'connected');
				appSelectionStore.markCredentialConnected(credential.id);
			} else {
				cardStates.set(credentialType.name, 'error');
			}

			oauthChannel.removeEventListener('message', receiveMessage);

			if (oauthPopup) {
				oauthPopup.close();
			}
		};

		oauthChannel.addEventListener('message', receiveMessage);

		const checkPopupClosed = setInterval(() => {
			if (oauthPopup?.closed) {
				clearInterval(checkPopupClosed);
				const state = cardStates.get(credentialType.name);
				if (state === 'loading') {
					cardStates.set(credentialType.name, 'default');
					void credentialsStore.deleteCredential({ id: credential.id });
				}
				oauthChannel.removeEventListener('message', receiveMessage);
			}
		}, 500);
	} catch (error) {
		cardStates.set(credentialType.name, 'error');
		toast.showError(error, i18n.baseText('appSelection.error.oauthFailed'));
	}
};

const handleManualSetupFlow = (appEntry: AppEntry) => {
	const { credentialType } = appEntry;
	pendingCredentialType.value = credentialType.name;
	cardStates.set(credentialType.name, 'loading');
	uiStore.openNewCredential(credentialType.name);
};

const handleCardClick = async (appEntry: AppEntry) => {
	const { credentialType, supportsInstantOAuth } = appEntry;
	const currentState = cardStates.get(credentialType.name);

	if (currentState === 'loading' || currentState === 'connected') {
		return;
	}

	if (supportsInstantOAuth) {
		await handleInstantOAuthFlow(appEntry);
	} else {
		handleManualSetupFlow(appEntry);
	}
};

const handleContinue = () => {
	appSelectionStore.trackCompleted();
	toast.showMessage({
		title: i18n.baseText('appSelection.toast.success'),
		type: 'success',
	});
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
