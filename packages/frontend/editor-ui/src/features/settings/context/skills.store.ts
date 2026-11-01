import type {
	AcceptSkillUpdatesDto,
	ReviewSkillUpdateDto,
	ConnectSkillSourceDto,
	AddSkillSourceSkillsDto,
	SkillSourceListItem,
	CreateSkillDto,
	DiscoverSkillSourceDto,
	SaveSkillDto,
	SkillDetail,
	SkillListCollapsedSource,
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
	/** The folded sources on the page, each one row in place of its skills. */
	const collapsedSources = ref<SkillListCollapsedSource[]>([]);
	const sources = ref<SkillSourceListItem[]>([]);
	/** The skills that each source gained since the user last imported from it, by source id. */
	const newSkillCounts = ref<Record<string, number>>({});
	const count = ref(0);
	const loading = ref(false);

	// Only the newest read commits, so a slow earlier search cannot overwrite a later one.
	let latestRead = 0;

	async function fetchSkills(query: SkillListQuery = {}) {
		const read = ++latestRead;
		loading.value = true;
		try {
			const response = await api.getSkills(rootStore.restApiContext, query);
			if (read === latestRead) {
				skills.value = response.data;
				collapsedSources.value = response.collapsedSources ?? [];
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

	async function fetchSkill(id: string): Promise<SkillDetail> {
		return await api.getSkill(rootStore.restApiContext, id);
	}

	async function createSkill(payload: CreateSkillDto): Promise<SkillDetail> {
		return await api.createSkill(rootStore.restApiContext, payload);
	}

	async function saveSkill(id: string, payload: SaveSkillDto): Promise<SkillSaveResponse> {
		return await api.saveSkill(rootStore.restApiContext, id, payload);
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

	async function discoverMore(sourceId: string) {
		return await api.discoverMoreSkills(rootStore.restApiContext, sourceId);
	}

	async function addSourceSkills(sourceId: string, payload: AddSkillSourceSkillsDto) {
		return await api.addSourceSkills(rootStore.restApiContext, sourceId, payload);
	}

	/** Asks the server how many skills the source gained. The server lists the source at most every few minutes. */
	async function checkSourceForNewSkills(sourceId: string) {
		const { newSkillCount } = await api.checkSourceForNewSkills(rootStore.restApiContext, sourceId);
		newSkillCounts.value = { ...newSkillCounts.value, [sourceId]: newSkillCount };
		return newSkillCount;
	}

	/** Deletes a source with no skills left, and drops it from the list. */
	async function deleteSource(sourceId: string) {
		await api.deleteSkillSource(rootStore.restApiContext, sourceId);
		sources.value = sources.value.filter((source) => source.id !== sourceId);
	}

	/** Check now on the source of a synced skill. The caller reloads the list. */
	async function checkForUpdates(id: string) {
		return await api.checkSkillForUpdates(rootStore.restApiContext, id);
	}

	let latestSourcesRead = 0;

	/** The sources that the user can see. A newer read wins, as for skills. */
	async function fetchSources() {
		const read = ++latestSourcesRead;
		const response = await api.listSkillSources(rootStore.restApiContext);
		if (read === latestSourcesRead) sources.value = response;
		return response;
	}

	async function checkSource(sourceId: string) {
		return await api.checkSkillSource(rootStore.restApiContext, sourceId);
	}

	async function fetchSourceUpdates(sourceId: string) {
		return await api.getSkillSourceUpdates(rootStore.restApiContext, sourceId);
	}

	async function acceptSourceUpdates(sourceId: string, payload: AcceptSkillUpdatesDto) {
		return await api.acceptSkillSourceUpdates(rootStore.restApiContext, sourceId, payload);
	}

	async function fetchSkillUpdate(skillId: string) {
		return await api.getSkillUpdate(rootStore.restApiContext, skillId);
	}

	async function acceptSkillUpdate(skillId: string, payload: ReviewSkillUpdateDto) {
		return await api.acceptSkillUpdate(rootStore.restApiContext, skillId, payload);
	}

	async function skipSkillUpdate(skillId: string, payload: ReviewSkillUpdateDto) {
		await api.skipSkillUpdate(rootStore.restApiContext, skillId, payload);
	}

	return {
		sources,
		newSkillCounts,
		fetchSources,
		checkSourceForNewSkills,
		discoverMore,
		addSourceSkills,
		deleteSource,
		skills,
		collapsedSources,
		checkSource,
		fetchSourceUpdates,
		acceptSourceUpdates,
		fetchSkillUpdate,
		acceptSkillUpdate,
		skipSkillUpdate,
		count,
		loading,
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
