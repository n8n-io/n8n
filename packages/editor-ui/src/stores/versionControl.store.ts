import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import type { IDataObject } from 'n8n-workflow';
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
		authorName: '',
		authorEmail: '',
		repositoryUrl: '',
		branchReadOnly: false,
		branchColor: '#000000',
		connected: false,
		publicKey: '',
	});

	const state = reactive({
		branches: [] as string[],
		currentBranch: '',
		authorName: '',
		authorEmail: '',
		repositoryUrl: '',
		sshKey: '',
		commitMessage: 'commit message',
	});

	const initSsh = async (data: IDataObject) => {
		state.sshKey = await vcApi.initSsh(rootStore.getRestApiContext, data);
	};

	const initRepository = async () => {
		const { branches, currentBranch } = await vcApi.initRepository(rootStore.getRestApiContext);
		state.branches = branches;
		state.currentBranch = currentBranch;
	};

	const sync = async (data: { commitMessage: string }) => {
		state.commitMessage = data.commitMessage;
		return vcApi.sync(rootStore.getRestApiContext, { message: data.commitMessage });
	};
	const getConfig = async () => {
		const { remoteRepository, name, email, currentBranch } = await vcApi.getConfig(
			rootStore.getRestApiContext,
		);
		state.repositoryUrl = remoteRepository;
		state.authorName = name;
		state.authorEmail = email;
		state.currentBranch = currentBranch;
	};

	const setPreferences = (data: Partial<VersionControlPreferences>) => {
		Object.assign(preferences, data);
	};

	const getPreferences = async () => {
		const data = await vcApi.getPreferences(rootStore.getRestApiContext);
		setPreferences(data);
	};

	const savePreferences = async (preferences: Partial<VersionControlPreferences>) => {
		const data = await vcApi.setPreferences(rootStore.getRestApiContext, preferences);
		setPreferences(data);
	};

	return {
		isEnterpriseVersionControlEnabled,
		state,
		initSsh,
		initRepository,
		sync,
		getConfig,
		getPreferences,
		setPreferences,
		savePreferences,
	};
});
