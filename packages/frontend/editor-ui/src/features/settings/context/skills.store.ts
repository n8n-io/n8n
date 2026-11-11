import type {
	ConnectSkillSourceDto,
	CreateSkillDto,
	DiscoverSkillSourceDto,
	SaveSkillDto,
	SkillDetail,
	SkillListItem,
	SkillSaveResponse,
	SkillSourceConnectResponse,
	SkillSourceDiscovery,
	ListSkillSourceCredentialsQueryDto,
	ListSkillSourceRepositoriesQueryDto,
} from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import * as api from './skills.api';
import type { SkillListQuery } from './skills.api';

/** The skills list in Settings > Context > Skills. */
export const useSkillsStore = defineStore('contextSkills', () => {
	const rootStore = useRootStore();

	const skills = ref<SkillListItem[]>([]);
	const count = ref(0);
	const loading = ref(false);
	/** Current names for skill artifact tabs, including renames made in the editor. */
	const skillNames = ref(new Map<string, string>());

	// Only the newest read commits, so a slow earlier search cannot overwrite a later one.
	let latestRead = 0;

	async function fetchSkills(query: SkillListQuery = {}) {
		const read = ++latestRead;
		loading.value = true;
		try {
			const response = await api.getSkills(rootStore.restApiContext, query);
			if (read === latestRead) {
				skills.value = response.data;
				count.value = response.count;
			}
			return response;
		} finally {
			if (read === latestRead) loading.value = false;
		}
	}

	/** The overview card needs the total only, so it asks for a single row. */
	async function fetchSkillCount() {
		await fetchSkills({ take: 1 });
	}

	/** For the creator filter of the skills list. */
	async function fetchCreators() {
		return await api.getSkillCreators(rootStore.restApiContext);
	}

	/** For the agent filter of the skills list. */
	async function fetchAgents(query: Parameters<typeof api.getSkillAgents>[1] = {}) {
		return await api.getSkillAgents(rootStore.restApiContext, query);
	}

	/** A default name that no skill in the scope has yet. */
	async function fetchNewSkillName(query: Parameters<typeof api.getNewSkillName>[1]) {
		return await api.getNewSkillName(rootStore.restApiContext, query);
	}

	// Only the newest read, save, or Assistant update sets the name, so a slow earlier read cannot
	// bring back the name from before a rename.
	const latestNameRequest = new Map<string, number>();
	let nameRequests = 0;

	function startNameRequest(id: string): number {
		const request = ++nameRequests;
		latestNameRequest.set(id, request);
		return request;
	}

	function setSkillName(id: string, request: number, name: string) {
		if (latestNameRequest.get(id) === request) skillNames.value.set(id, name);
	}

	function updateSkillName(id: string, name: string) {
		setSkillName(id, startNameRequest(id), name);
	}

	async function fetchSkill(id: string): Promise<SkillDetail> {
		const request = startNameRequest(id);
		const detail = await api.getSkill(rootStore.restApiContext, id);
		setSkillName(id, request, detail.name);
		return detail;
	}

	async function createSkill(payload: CreateSkillDto): Promise<SkillDetail> {
		return await api.createSkill(rootStore.restApiContext, payload);
	}

	async function saveSkill(id: string, payload: SaveSkillDto): Promise<SkillSaveResponse> {
		const request = startNameRequest(id);
		const saved = await api.saveSkill(rootStore.restApiContext, id, payload);
		setSkillName(id, request, saved.skill.name);
		return saved;
	}

	async function deleteSkill(id: string): Promise<void> {
		await api.deleteSkill(rootStore.restApiContext, id);
	}

	/** The credentials that can read a private source in the scope. */
	async function fetchSourceCredentials(query: ListSkillSourceCredentialsQueryDto) {
		return await api.getSkillSourceCredentials(rootStore.restApiContext, query);
	}

	/** The repositories that a credential can read, to pick one in place of a link. */
	async function fetchSourceRepositories(query: ListSkillSourceRepositoriesQueryDto) {
		return await api.getSkillSourceRepositories(rootStore.restApiContext, query);
	}

	/** Lists the skills that a GitHub link holds, for the "Choose skills" picker. */
	async function discoverSource(payload: DiscoverSkillSourceDto): Promise<SkillSourceDiscovery> {
		return await api.discoverSkillSource(rootStore.restApiContext, payload);
	}

	/** Connects a GitHub link and imports the picked skills. The caller reloads the list. */
	async function connectSource(
		payload: ConnectSkillSourceDto,
	): Promise<SkillSourceConnectResponse> {
		return await api.connectSkillSource(rootStore.restApiContext, payload);
	}

	/** Stops syncing one skill, which makes it editable. The caller reloads the list. */
	async function stopSyncingSkill(id: string): Promise<void> {
		await api.stopSyncingSkill(rootStore.restApiContext, id);
	}

	/** Check now on the source of a synced skill. The caller reloads the list. */
	async function checkForUpdates(id: string) {
		return await api.checkSkillForUpdates(rootStore.restApiContext, id);
	}

	return {
		skills,
		count,
		loading,
		skillNames,
		updateSkillName,
		fetchSkills,
		fetchSkillCount,
		fetchCreators,
		fetchAgents,
		fetchSkill,
		fetchNewSkillName,
		createSkill,
		saveSkill,
		deleteSkill,
		fetchSourceCredentials,
		fetchSourceRepositories,
		discoverSource,
		connectSource,
		stopSyncingSkill,
		checkForUpdates,
	};
});
