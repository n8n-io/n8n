import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { VersionControlBase, VersionControlCommit } from '@/Interface';
import * as vcApi from '@/api/versionControl';
import { useRootStore } from '@/stores/n8nRootStore';

export const useVersionControlStore = defineStore('versionControl', () => {
	const rootStore = useRootStore();

	const branches = ref<string[]>([]);
	const currentBranch = ref<string>('');
	const authorName = ref<string>('');
	const authorEmail = ref<string>('');
	const remoteRepository = ref<string>('');
	const sshPublicKey = ref<string>('');

	const initSsh = async (data: VersionControlBase) => {
		sshPublicKey.value = await vcApi.initSsh(rootStore.getRestApiContext, data);
		remoteRepository.value = data.remoteRepository;
	};

	const initRepository = async () => {
		const repo = await vcApi.initRepository(rootStore.getRestApiContext);
		branches.value = repo.branches;
		currentBranch.value = repo.currentBranch;
	};

	const sync = async (data: VersionControlCommit) => {
		return vcApi.sync(rootStore.getRestApiContext, { message: data.message });
	};

	const getConfig = async () => {
		const config = await vcApi.getConfig(rootStore.getRestApiContext);
		remoteRepository.value = config.remoteRepository;
		authorName.value = config.name;
		authorEmail.value = config.email;
		branches.value = config.branches;
		currentBranch.value = config.currentBranch;
		sshPublicKey.value = config.sshPublicKey;
	};

	const pull = async () => {
		return vcApi.pull(rootStore.getRestApiContext);
	};

	return {
		initSsh,
		initRepository,
		sync,
		getConfig,
		pull,
		branches,
		currentBranch,
		authorName,
		authorEmail,
		remoteRepository,
		sshPublicKey,
	};
});
