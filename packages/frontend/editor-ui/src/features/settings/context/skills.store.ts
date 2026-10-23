import type {
	CreateSkillDto,
	SaveSkillDto,
	SkillDetail,
	SkillListItem,
	SkillSaveResponse,
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
	};
});
