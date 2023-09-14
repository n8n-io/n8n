import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import * as vcApi from '@/api/sourceControl';
import type { SourceControlPreferences, SshKeyTypes } from '@/Interface';
import type { TupleToUnion } from '@/utils/typeHelpers';

export const useSourceControlStore = defineStore('sourceControl', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const isEnterpriseSourceControlEnabled = computed(() =>
		settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.SourceControl),
	);

	const sshKeyTypes: SshKeyTypes = ['ed25519', 'rsa'];
	const sshKeyTypesWithLabel = reactive(
		sshKeyTypes.map((value) => ({ value, label: value.toUpperCase() })),
	);

	const preferences = reactive<SourceControlPreferences>({
		branchName: '',
		branches: [],
		repositoryUrl: '',
		branchReadOnly: false,
		branchColor: '#5296D6',
		connected: false,
		publicKey: '',
		keyGeneratorType: 'ed25519',
	});

	const state = reactive<{
		commitMessage: string;
	}>({
		commitMessage: 'commit message',
	});

	const pushWorkfolder = async (data: {
		commitMessage: string;
		fileNames?: Array<{
			conflict: boolean;
			file: string;
			id: string;
			location: string;
			name: string;
			status: string;
			type: string;
			updatedAt?: string | undefined;
		}>;
		force: boolean;
	}) => {
		state.commitMessage = data.commitMessage;
		await vcApi.pushWorkfolder(rootStore.getRestApiContext, {
			force: data.force,
			message: data.commitMessage,
			...(data.fileNames ? { fileNames: data.fileNames } : {}),
		});
	};

	const pullWorkfolder = async (force: boolean) => {
		return vcApi.pullWorkfolder(rootStore.getRestApiContext, { force });
	};

	const setPreferences = (data: Partial<SourceControlPreferences>) => {
		Object.assign(preferences, data);
	};

	const makePreferencesAction =
		(action: typeof vcApi.savePreferences) =>
		async (preferences: Partial<SourceControlPreferences>) => {
			const data = await action(rootStore.getRestApiContext, preferences);
			setPreferences(data);
		};

	const getBranches = async () => {
		const data = await vcApi.getBranches(rootStore.getRestApiContext);
		setPreferences(data);
	};

	const getPreferences = async () => {
		const data = await vcApi.getPreferences(rootStore.getRestApiContext);
		setPreferences(data);
	};

	const savePreferences = makePreferencesAction(vcApi.savePreferences);

	const updatePreferences = makePreferencesAction(vcApi.updatePreferences);

	const disconnect = async (keepKeyPair: boolean) => {
		await vcApi.disconnect(rootStore.getRestApiContext, keepKeyPair);
		setPreferences({ connected: false, branches: [] });
	};

	const generateKeyPair = async (keyGeneratorType?: TupleToUnion<SshKeyTypes>) => {
		await vcApi.generateKeyPair(rootStore.getRestApiContext, keyGeneratorType);
		const data = await vcApi.getPreferences(rootStore.getRestApiContext); // To be removed once the API is updated

		preferences.publicKey = data.publicKey;

		return { publicKey: data.publicKey };
	};

	const getStatus = async () => {
		return vcApi.getStatus(rootStore.getRestApiContext);
	};

	const getAggregatedStatus = async () => {
		return vcApi.getAggregatedStatus(rootStore.getRestApiContext);
	};

	return {
		isEnterpriseSourceControlEnabled,
		state,
		preferences,
		pushWorkfolder,
		pullWorkfolder,
		getPreferences,
		setPreferences,
		generateKeyPair,
		getBranches,
		savePreferences,
		updatePreferences,
		disconnect,
		getStatus,
		getAggregatedStatus,
		sshKeyTypesWithLabel,
	};
});
