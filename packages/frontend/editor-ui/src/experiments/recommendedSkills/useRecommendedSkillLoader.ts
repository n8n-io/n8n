import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import type { RecommendedSkill, RecommendedSkillId } from './recommendedSkills';

export function useRecommendedSkillLoader() {
	const i18n = useI18n();
	const { showError } = useToast();
	const loadingId = ref<RecommendedSkillId>();

	async function loadRecommendedSkill(recommended: RecommendedSkill) {
		if (loadingId.value) return undefined;
		loadingId.value = recommended.id;
		try {
			return await recommended.load();
		} catch (error) {
			showError(error, i18n.baseText('experiments.recommendedSkills.loadError'));
			return undefined;
		} finally {
			loadingId.value = undefined;
		}
	}

	return { loadingId, loadRecommendedSkill };
}
