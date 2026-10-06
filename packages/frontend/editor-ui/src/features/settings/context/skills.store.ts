import type {
	AgentSkill,
	CreateHubSkillDto,
	HubSkillDetail,
	HubSkillListItem,
	HubSkillListQuery,
	HubSkillSaveResponse,
} from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import * as api from './skills.api';

/** The skills hub list in Settings > Context > Skills. */
export const useSkillsHubStore = defineStore('skillsHub', () => {
	const rootStore = useRootStore();

	const skills = ref<HubSkillListItem[]>([]);
	const count = ref(0);
	const loading = ref(false);

	// Only the newest read commits, so a slow earlier search cannot overwrite a later one.
	let latestRead = 0;

	async function fetchSkills(query: HubSkillListQuery = {}) {
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

	async function fetchSkill(id: string): Promise<HubSkillDetail> {
		return await api.getSkill(rootStore.restApiContext, id);
	}

	async function createSkill(payload: CreateHubSkillDto): Promise<HubSkillDetail> {
		return await api.createSkill(rootStore.restApiContext, payload);
	}

	/** Writes the draft, then saves it as the version agents read. */
	async function updateAndSaveSkill(
		id: string,
		skill: AgentSkill,
		baseSkillHash?: string,
	): Promise<HubSkillSaveResponse> {
		await api.updateSkillDraft(rootStore.restApiContext, id, { ...skill, baseSkillHash });
		return await api.saveSkill(rootStore.restApiContext, id);
	}

	async function deleteSkill(id: string): Promise<void> {
		await api.deleteSkill(rootStore.restApiContext, id);
	}

	return {
		skills,
		count,
		loading,
		fetchSkills,
		fetchSkill,
		createSkill,
		updateAndSaveSkill,
		deleteSkill,
	};
});
