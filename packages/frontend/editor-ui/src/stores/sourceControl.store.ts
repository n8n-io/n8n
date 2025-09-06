import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as vcApi from '@/api/sourceControl';
import type {
	SourceControlPreferences,
	SourceControlFormData,
	SshKeyTypes,
	KeyGeneratorType,
	SourceControlProtocol,
} from '@/types/sourceControl.types';
import type { SourceControlledFile } from '@n8n/api-types';

export const useSourceControlStore = defineStore('sourceControl', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const isEnterpriseSourceControlEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.SourceControl],
	);

	const sshKeyTypes: SshKeyTypes = ['ed25519', 'rsa'];
	const sshKeyTypesWithLabel = ref(
		sshKeyTypes.map((value) => ({ value, label: value.toUpperCase() })),
	);

	const protocolTypes: SourceControlProtocol[] = ['ssh', 'https'];
	const protocolTypesWithLabel = ref(
		protocolTypes.map((value) => ({
			value,
			label: value.toUpperCase(),
			description:
				value === 'ssh'
					? 'SSH Key authentication (more secure)'
					: 'Username and Personal Access Token',
		})),
	);

	// Use reactive with all required default values for Vue 3 compatibility
	const preferences = reactive<SourceControlPreferences>({
		connected: false,
		repositoryUrl: '',
		branchName: '',
		branches: [],
		branchReadOnly: false,
		branchColor: '#5296D6',
		protocol: 'ssh', // Default to SSH for backward compatibility
		username: '',
		publicKey: '',
		keyGeneratorType: 'ed25519',
		currentBranch: undefined, // Explicitly define optional property
	});

	// Temporary form state for sensitive data (not persisted)
	const formState = reactive<Pick<SourceControlFormData, 'personalAccessToken' | 'initRepo'>>({
		personalAccessToken: '',
		initRepo: false,
	});

	const state = ref<{
		commitMessage: string;
	}>({
		commitMessage: 'commit message',
	});

	const pushWorkfolder = async (data: {
		commitMessage: string;
		fileNames: SourceControlledFile[];
		force: boolean;
	}) => {
		state.value.commitMessage = data.commitMessage;
		await vcApi.pushWorkfolder(rootStore.restApiContext, {
			force: data.force,
			commitMessage: data.commitMessage,
			fileNames: data.fileNames,
		});
	};

	const pullWorkfolder = async (force: boolean) => {
		return await vcApi.pullWorkfolder(rootStore.restApiContext, { force });
	};

	const setPreferences = (data: Partial<SourceControlPreferences>) => {
		Object.assign(preferences, data);

		// Clear sensitive form data when switching protocols
		if (data.protocol && data.protocol !== preferences.protocol) {
			cleanupProtocolSwitch();
		}
	};

	const cleanupProtocolSwitch = () => {
		// Clear form state when switching protocols
		formState.personalAccessToken = '';
		formState.initRepo = false;

		// Clear protocol-specific fields
		if (preferences.protocol === 'ssh') {
			preferences.username = '';
		} else if (preferences.protocol === 'https') {
			// Don't clear publicKey as user might switch back
		}
	};

	const getBranches = async () => {
		try {
			const data = await vcApi.getBranches(rootStore.restApiContext);
			setPreferences(data);
		} catch (error) {
			// Enhanced error handling for branch fetching
			if (error instanceof Error) {
				if (error.message.includes('401') || error.message.includes('authentication')) {
					const authMethod = isHttpsProtocol.value ? 'HTTPS credentials' : 'SSH key';
					throw new Error(
						`Authentication failed while fetching branches. Please check your ${authMethod} and reconnect.`,
					);
				} else if (error.message.includes('404')) {
					throw new Error(
						'Repository branches not found. Please check the repository URL and access permissions.',
					);
				} else if (error.message.includes('timeout')) {
					throw new Error(
						'Request timed out. Please check your network connection and repository accessibility.',
					);
				}
			}
			throw error;
		}
	};

	const getPreferences = async () => {
		const data = await vcApi.getPreferences(rootStore.restApiContext);
		setPreferences(data);
	};

	const savePreferences = async (
		preferencesData: Partial<SourceControlPreferences> & { personalAccessToken?: string },
	) => {
		try {
			// Separate sensitive data from regular preferences
			const { personalAccessToken, ...regularPrefs } = preferencesData;

			// For HTTPS, include PAT in the request but don't persist it in store
			const requestData =
				isHttpsProtocol.value && personalAccessToken
					? { ...regularPrefs, personalAccessToken }
					: regularPrefs;

			const data = await vcApi.savePreferences(rootStore.restApiContext, requestData);
			setPreferences(data);

			// Clear sensitive form data after successful save
			if (personalAccessToken) {
				formState.personalAccessToken = '';
			}
		} catch (error) {
			// Enhanced error handling with protocol-specific messaging
			if (error instanceof Error) {
				if (error.message.includes('401') || error.message.includes('authentication')) {
					const authMethod = isHttpsProtocol.value
						? 'username and personal access token'
						: 'SSH key pair';
					throw new Error(`Authentication failed. Please check your ${authMethod}.`);
				} else if (error.message.includes('404') || error.message.includes('repository')) {
					throw new Error(
						'Repository not found. Please check the repository URL and your access permissions.',
					);
				} else if (error.message.includes('422') || error.message.includes('invalid')) {
					throw new Error(
						'Invalid repository configuration. Please verify all required fields are correct.',
					);
				} else if (error.message.includes('timeout')) {
					throw new Error(
						'Connection timed out. Please check your network connection and try again.',
					);
				}
			}
			throw error;
		}
	};

	const updatePreferences = async (preferencesData: Partial<SourceControlPreferences>) => {
		try {
			const data = await vcApi.updatePreferences(rootStore.restApiContext, preferencesData);
			setPreferences(data);
		} catch (error) {
			// Enhanced error handling with protocol awareness
			if (error instanceof Error) {
				if (error.message.includes('401') || error.message.includes('authentication')) {
					const authMethod = isHttpsProtocol.value ? 'HTTPS credentials' : 'SSH key';
					throw new Error(
						`Authentication failed. Please check your ${authMethod} and reconnect your repository.`,
					);
				} else if (error.message.includes('timeout')) {
					throw new Error('Request timed out. Please check your network connection and try again.');
				}
			}
			throw error;
		}
	};

	const disconnect = async (keepKeyPair: boolean) => {
		await vcApi.disconnect(rootStore.restApiContext, keepKeyPair);
		setPreferences({ connected: false, branches: [] });
	};

	const generateKeyPair = async (keyGeneratorType?: KeyGeneratorType) => {
		await vcApi.generateKeyPair(rootStore.restApiContext, keyGeneratorType);
		const data = await vcApi.getPreferences(rootStore.restApiContext); // To be removed once the API is updated

		preferences.publicKey = data.publicKey;

		return { publicKey: data.publicKey };
	};

	const getStatus = async () => {
		return await vcApi.getStatus(rootStore.restApiContext);
	};

	const getAggregatedStatus = async () => {
		return await vcApi.getAggregatedStatus(rootStore.restApiContext);
	};

	const getRemoteWorkflow = async (workflowId: string) => {
		return await vcApi.getRemoteWorkflow(rootStore.restApiContext, workflowId);
	};

	// Protocol-dependent computed properties for better reactivity
	const isHttpsProtocol = computed(() => preferences.protocol === 'https');
	const isSshProtocol = computed(() => preferences.protocol === 'ssh');
	const requiresCredentials = computed(() => isHttpsProtocol.value);

	// Enhanced computed validation helpers
	const hasValidRepoUrl = computed(() => Boolean(preferences.repositoryUrl?.trim()));
	const hasValidSshKey = computed(() =>
		Boolean(preferences.publicKey?.trim() && preferences.keyGeneratorType),
	);
	const hasValidHttpsCredentials = computed(() =>
		Boolean(preferences.username?.trim() && formState.personalAccessToken?.trim()),
	);

	const canConnect = computed(() => {
		if (!hasValidRepoUrl.value) return false;

		return isHttpsProtocol.value ? hasValidHttpsCredentials.value : hasValidSshKey.value;
	});

	// Enhanced connection status computed property
	const connectionStatus = computed(() => {
		if (!preferences.connected) return 'disconnected';
		if (preferences.branches.length === 0) return 'connected_no_branches';
		return 'fully_connected';
	});

	// Protocol requirements computed property
	const protocolRequirements = computed(() => {
		if (isHttpsProtocol.value) {
			return {
				requiredFields: ['repositoryUrl', 'username', 'personalAccessToken'] as const,
				optionalFields: ['branchName', 'initRepo'] as const,
				validationMessage: 'HTTPS requires repository URL, username, and personal access token',
			};
		}

		return {
			requiredFields: ['repositoryUrl', 'publicKey'] as const,
			optionalFields: ['branchName', 'keyGeneratorType'] as const,
			validationMessage: 'SSH requires repository URL and SSH key pair',
		};
	});

	// Repository URL validation helper
	const isValidRepositoryUrl = computed(() => {
		const url = preferences.repositoryUrl?.trim();
		if (!url) return false;

		// SSH format validation
		const sshPattern = /^git@[\w.-]+:[\w.-]+\/[\w.-]+(\.git)?$/;
		// HTTPS format validation
		const httpsPattern = /^https:\/\/[\w.-]+\/[\w.-]+\/[\w.-]+(\.git)?$/;

		return sshPattern.test(url) || httpsPattern.test(url);
	});

	// Protocol compatibility with URL
	const isProtocolCompatibleWithUrl = computed(() => {
		const url = preferences.repositoryUrl?.trim();
		if (!url) return true; // No URL to validate against

		const isHttpsUrl = url.startsWith('https://');
		const isSshUrl = url.startsWith('git@');

		if (isHttpsProtocol.value) {
			return isHttpsUrl;
		} else {
			return isSshUrl;
		}
	});

	// Overall form validation state
	const formValidationState = computed(() => {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Repository URL validation
		if (!hasValidRepoUrl.value) {
			errors.push('Repository URL is required');
		} else if (!isValidRepositoryUrl.value) {
			errors.push('Repository URL format is invalid');
		} else if (!isProtocolCompatibleWithUrl.value) {
			const expectedProtocol = preferences.repositoryUrl?.startsWith('https://') ? 'HTTPS' : 'SSH';
			warnings.push(
				`Repository URL suggests ${expectedProtocol} protocol, but ${preferences.protocol?.toUpperCase()} is selected`,
			);
		}

		// Protocol-specific validation
		if (isHttpsProtocol.value) {
			if (!preferences.username?.trim()) {
				errors.push('Username is required for HTTPS authentication');
			}
			if (!formState.personalAccessToken?.trim()) {
				errors.push('Personal Access Token is required for HTTPS authentication');
			}
		} else {
			if (!hasValidSshKey.value) {
				errors.push('SSH key pair is required for SSH authentication');
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			hasErrors: errors.length > 0,
			hasWarnings: warnings.length > 0,
		};
	});

	// Reset form state utility
	const resetForm = () => {
		// Reset preferences to defaults
		Object.assign(preferences, {
			connected: false,
			repositoryUrl: '',
			branchName: '',
			branches: [],
			branchReadOnly: false,
			branchColor: '#5296D6',
			protocol: 'ssh',
			username: '',
			publicKey: '',
			keyGeneratorType: 'ed25519',
			currentBranch: undefined,
		});

		// Reset form state
		formState.personalAccessToken = '';
		formState.initRepo = false;

		// Reset other state
		state.value.commitMessage = 'commit message';
	};

	return {
		isEnterpriseSourceControlEnabled,
		state,
		preferences,
		formState,
		// Protocol computed properties
		isHttpsProtocol,
		isSshProtocol,
		requiresCredentials,
		protocolRequirements,
		// Validation computed properties
		hasValidRepoUrl,
		hasValidSshKey,
		hasValidHttpsCredentials,
		canConnect,
		connectionStatus,
		isValidRepositoryUrl,
		isProtocolCompatibleWithUrl,
		formValidationState,
		// Actions
		pushWorkfolder,
		pullWorkfolder,
		getPreferences,
		setPreferences,
		cleanupProtocolSwitch,
		resetForm,
		generateKeyPair,
		getBranches,
		savePreferences,
		updatePreferences,
		disconnect,
		getStatus,
		getAggregatedStatus,
		getRemoteWorkflow,
		// Type references
		sshKeyTypesWithLabel: sshKeyTypesWithLabel.value,
		protocolTypesWithLabel: protocolTypesWithLabel.value,
	};
});
