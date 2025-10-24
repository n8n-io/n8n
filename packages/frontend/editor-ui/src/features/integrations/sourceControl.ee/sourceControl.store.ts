import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as vcApi from './sourceControl.api';
import type { SourceControlPreferences, SshKeyTypes } from './sourceControl.types';
import type { TupleToUnion } from '@/utils/typeHelpers';
import type { SourceControlledFile } from '@n8n/api-types';

export const useSourceControlStore = defineStore('sourceControl', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const isEnterpriseSourceControlEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.SourceControl],
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
		connectionType: 'ssh',
	});

	const state = reactive<{
		commitMessage: string;
	}>({
		commitMessage: 'commit message',
	});

	const pushWorkfolder = async (data: {
		commitMessage: string;
		fileNames: SourceControlledFile[];
		force: boolean;
	}) => {
		state.commitMessage = data.commitMessage;
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
	};

	const makePreferencesAction =
		(action: typeof vcApi.savePreferences) =>
		async (preferences: Partial<SourceControlPreferences>) => {
			const data = await action(rootStore.restApiContext, preferences);
			setPreferences(data);
		};

	const getBranches = async () => {
		const data = await vcApi.getBranches(rootStore.restApiContext);
		setPreferences(data);
	};

	const getPreferences = async () => {
		const data = await vcApi.getPreferences(rootStore.restApiContext);
		setPreferences(data);
	};

	const savePreferences = makePreferencesAction(vcApi.savePreferences);

	const updatePreferences = makePreferencesAction(vcApi.updatePreferences);

	const disconnect = async (keepKeyPair: boolean) => {
		await vcApi.disconnect(rootStore.restApiContext, keepKeyPair);
		setPreferences({ connected: false, branches: [] });
	};

	const generateKeyPair = async (keyGeneratorType?: TupleToUnion<SshKeyTypes>) => {
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
		getRemoteWorkflow,
		sshKeyTypesWithLabel,
	};
});
