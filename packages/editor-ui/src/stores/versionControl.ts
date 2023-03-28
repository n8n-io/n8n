import { reactive } from 'vue';
import { defineStore } from 'pinia';
import { IDataObject } from 'n8n-workflow';
import * as vcApi from '@/api/versionControl';
import { useRootStore } from '@/stores/n8nRootStore';

export const useVersionControlStore = defineStore('versionControl', () => {
	const rootStore = useRootStore();

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

	const sync = async () => {
		return vcApi.sync(rootStore.getRestApiContext, { message: state.commitMessage });
	};

	return {
		initSsh,
		initRepository,
		sync,
		state,
	};
});
