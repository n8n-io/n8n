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
		loading: boolean;
		commitMessage: string;
		error: Error | null;
	}>({
		loading: false,
		commitMessage: 'commit message',
		error: null,
	});

	const setError = (error: Error | null) => {
		state.error = error;
	};

	const pushWorkfolder = async (data: { commitMessage: string }) => {
		state.loading = true;
		state.commitMessage = data.commitMessage;
		try {
			await vcApi.pushWorkfolder(rootStore.getRestApiContext, { message: data.commitMessage });
		} catch (error) {
			setError(error);
		}
		state.loading = false;
	};

	const pullWorkfolder = async (force: boolean) => {
		state.loading = true;
		try {
			await vcApi.pullWorkfolder(rootStore.getRestApiContext, { force });
		} catch (error) {
			setError(error);
		}
		state.loading = false;
	};

	const setPreferences = (data: Partial<VersionControlPreferences>) => {
		Object.assign(preferences, data);
	};

	const getBranches = async () => {
		state.loading = true;
		try {
			const data = await vcApi.getBranches(rootStore.getRestApiContext);
			setPreferences(data);
		} catch (error) {
			setError(error);
		}
		state.loading = false;
	};

	const getPreferences = async () => {
		state.loading = true;
		try {
			const data = await vcApi.getPreferences(rootStore.getRestApiContext);
			setPreferences(data);
			if (!data.publicKey) {
				await savePreferences({});
			}
			if (data.connected) {
				await getBranches();
			}
		} catch (error) {
			setError(error);
		}
		state.loading = false;
	};

	const savePreferences = async (preferences: Partial<VersionControlPreferences>) => {
		state.loading = true;
		try {
			const data = await vcApi.setPreferences(rootStore.getRestApiContext, preferences);
			setPreferences(data);
		} catch (error) {
			setError(error);
		}
		state.loading = false;
	};

	const setBranch = async (branch: string) => {
		state.loading = true;
		try {
			const data = await vcApi.setBranch(rootStore.getRestApiContext, branch);
			await vcApi.connect(rootStore.getRestApiContext);
			setPreferences({ ...data, connected: true });
		} catch (error) {
			setError(error);
		}
		state.loading = false;
	};

	const disconnect = async (keepKeyPair: boolean) => {
		state.loading = true;
		try {
			await vcApi.disconnect(rootStore.getRestApiContext, keepKeyPair);
			setPreferences({ connected: false, branches: [] });
		} catch (error) {
			setError(error);
		}
		state.loading = false;
	};

	return {
		isEnterpriseVersionControlEnabled,
		state,
		preferences,
		pushWorkfolder,
		pullWorkfolder,
		getPreferences,
		setPreferences,
		getBranches,
		savePreferences,
		setBranch,
		disconnect,
	};
});
