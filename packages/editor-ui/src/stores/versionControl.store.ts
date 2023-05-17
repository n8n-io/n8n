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

	const state = reactive({
		loading: false,
		commitMessage: 'commit message',
	});

	const pushWorkfolder = async (data: { commitMessage: string }) => {
		state.loading = true;
		state.commitMessage = data.commitMessage;
		await vcApi.pushWorkfolder(rootStore.getRestApiContext, { message: data.commitMessage });
		state.loading = false;
	};

	const pullWorkfolder = async () => {
		state.loading = true;
		await vcApi.pullWorkfolder(rootStore.getRestApiContext, { force: true });
		state.loading = false;
	};

	const setPreferences = (data: Partial<VersionControlPreferences>) => {
		Object.assign(preferences, data);
	};

	const getBranches = async () => {
		state.loading = true;
		const data = await vcApi.getBranches(rootStore.getRestApiContext);
		setPreferences(data);
		state.loading = false;
	};

	const getPreferences = async () => {
		state.loading = true;
		const data = await vcApi.getPreferences(rootStore.getRestApiContext);
		setPreferences(data);
		if (!data.publicKey)
			try {
				await savePreferences({});
			} catch (error) {
				await savePreferences({});
			}

		if (data.connected) {
			await getBranches();
		}
		state.loading = false;
	};

	const savePreferences = async (preferences: Partial<VersionControlPreferences>) => {
		state.loading = true;
		const data = await vcApi.setPreferences(rootStore.getRestApiContext, preferences);
		setPreferences(data);
		state.loading = false;
	};

	const setBranch = async (branch: string) => {
		state.loading = true;
		const data = await vcApi.setBranch(rootStore.getRestApiContext, branch);
		await vcApi.connect(rootStore.getRestApiContext);
		setPreferences({ ...data, connected: true });
		state.loading = false;
	};

	const disconnect = async (keepKeyPair: boolean) => {
		state.loading = true;
		await vcApi.disconnect(rootStore.getRestApiContext, keepKeyPair);
		setPreferences({ connected: false, branches: [] });
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
