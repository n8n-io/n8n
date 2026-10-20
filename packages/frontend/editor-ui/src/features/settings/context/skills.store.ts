import type {
	AcceptSkillGitUpdateDto,
	CheckSkillContentDto,
	CreateSkillDto,
	DiscoverGitHubSkillsResponse,
	ImportGitHubSkillsDto,
	ImportGitHubSkillsResponse,
	ImportSharedSkillDto,
	SkillCheckResult,
	SkillGitUpdateDetail,
	SaveSkillDto,
	SkillDetail,
	SkillListItem,
	SkillSaveResponse,
	SkillVersionDetail,
	SkillVersionSummary,
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

	async function fetchSkillVersions(id: string): Promise<SkillVersionSummary[]> {
		return await api.getSkillVersions(rootStore.restApiContext, id);
	}

	async function fetchSkillVersion(id: string, version: number): Promise<SkillVersionDetail> {
		return await api.getSkillVersion(rootStore.restApiContext, id, version);
	}

	async function updateSkillVersionLabel(
		id: string,
		version: number,
		label: string | null,
	): Promise<SkillVersionSummary> {
		return await api.updateSkillVersionLabel(rootStore.restApiContext, id, version, label);
	}

	async function discoverGitHubSkills(url: string): Promise<DiscoverGitHubSkillsResponse> {
		return await api.discoverGitHubSkills(rootStore.restApiContext, { url });
	}

	async function importGitHubSkills(
		payload: ImportGitHubSkillsDto,
	): Promise<ImportGitHubSkillsResponse> {
		return await api.importGitHubSkills(rootStore.restApiContext, payload);
	}

	async function checkSkillContent(
		skill: CheckSkillContentDto['skill'],
	): Promise<SkillCheckResult> {
		return await api.checkSkillContent(rootStore.restApiContext, { skill });
	}

	async function importSharedSkill(payload: ImportSharedSkillDto): Promise<SkillDetail> {
		return await api.importSharedSkill(rootStore.restApiContext, payload);
	}

	async function fetchSkillGitUpdate(id: string): Promise<SkillGitUpdateDetail> {
		return await api.getSkillGitUpdate(rootStore.restApiContext, id);
	}

	async function acceptSkillGitUpdate(id: string, payload: AcceptSkillGitUpdateDto) {
		return await api.acceptSkillGitUpdate(rootStore.restApiContext, id, payload);
	}

	async function skipSkillGitUpdate(id: string, toCommitSha: string): Promise<void> {
		await api.skipSkillGitUpdate(rootStore.restApiContext, id, toCommitSha);
	}

	async function checkSkillGitHub(id: string): Promise<SkillDetail> {
		return await api.checkSkillGitHub(rootStore.restApiContext, id);
	}

	async function stopSkillGitSync(id: string): Promise<void> {
		await api.stopSkillGitSync(rootStore.restApiContext, id);
	}

	return {
		skills,
		count,
		loading,
		fetchSkills,
		fetchSkillCount,
		fetchSkill,
		fetchNewSkillName,
		createSkill,
		saveSkill,
		deleteSkill,
		fetchSkillVersions,
		fetchSkillVersion,
		updateSkillVersionLabel,
		discoverGitHubSkills,
		importGitHubSkills,
		checkSkillContent,
		importSharedSkill,
		fetchSkillGitUpdate,
		acceptSkillGitUpdate,
		skipSkillGitUpdate,
		checkSkillGitHub,
		stopSkillGitSync,
	};
});
