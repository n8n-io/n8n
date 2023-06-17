import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import * as vcApi from '@/api/versionControl';
import { useRootStore } from '@/stores/n8nRoot.store';
import type { VersionControlPreferences } from '@/Interface';

export const useVersionControlStore = defineStore('versionControl', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const isEnterpriseVersionControlEnabled = computed(() =>
		settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.VersionControl),
	);

	const preferences = reactive<VersionControlPreferences>({
		branchName: '',
		branches: [],
		authorName: '',
		authorEmail: '',
		repositoryUrl: '',
		branchReadOnly: false,
		branchColor: '#F4A6DC',
		connected: false,
		publicKey: '',
	});

	const state = reactive<{
		commitMessage: string;
	}>({
		commitMessage: 'commit message',
	});

	const pushWorkfolder = async (data: { commitMessage: string; fileNames?: string[] }) => {
		state.commitMessage = data.commitMessage;
		await vcApi.pushWorkfolder(rootStore.getRestApiContext, {
			message: data.commitMessage,
			...(data.fileNames ? { fileNames: data.fileNames } : {}),
		});
	};

	const pullWorkfolder = async (force: boolean) => {
		await vcApi.pullWorkfolder(rootStore.getRestApiContext, { force });
	};

	const setPreferences = (data: Partial<VersionControlPreferences>) => {
		Object.assign(preferences, data);
	};

	const makePreferencesAction =
		(action: typeof vcApi.savePreferences | typeof vcApi.updatePreferences) =>
		async (preferences: Partial<VersionControlPreferences>) => {
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

	const generateKeyPair = async () => {
		await vcApi.generateKeyPair(rootStore.getRestApiContext);
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
		isEnterpriseVersionControlEnabled,
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
	};
});
