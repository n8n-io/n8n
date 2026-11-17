import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { RECOMMENDED_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS } from '@/app/constants/localStorage';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';

import type { RecommendedSkillId } from './recommendedSkills';

export type RecommendedSkillsEntryPoint = 'empty_state' | 'create_menu' | 'agent_skill_modal';

export function useRecommendedSkillsExperiment() {
	const posthogStore = usePostHog();
	const telemetry = useTelemetry();
	const addedSkillIds = useLocalStorage<RecommendedSkillId[]>(
		LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS,
		[],
		{ flush: 'sync' },
	);

	const showRecommendedSkills = computed(() =>
		posthogStore.isVariantEnabled(
			RECOMMENDED_SKILLS_EXPERIMENT.name,
			RECOMMENDED_SKILLS_EXPERIMENT.variant,
		),
	);

	const hasVariant = computed(() =>
		Boolean(posthogStore.getVariant(RECOMMENDED_SKILLS_EXPERIMENT.name)),
	);

	function trackExposure() {
		posthogStore.trackExposure(RECOMMENDED_SKILLS_EXPERIMENT.name);
	}

	function trackCardsShown(entryPoint: RecommendedSkillsEntryPoint) {
		telemetry.track(
			TELEMETRY_EVENT.CONTEXT.USER_VIEWED_RECOMMENDED_SKILLS,
			getExperimentTelemetryPayload(
				RECOMMENDED_SKILLS_EXPERIMENT,
				RECOMMENDED_SKILLS_EXPERIMENT.variant,
				{
					entry_point: entryPoint,
				},
			),
		);
	}

	function trackSkillAdded(
		recommendedSkillId: RecommendedSkillId,
		skillId: string | undefined,
		entryPoint: RecommendedSkillsEntryPoint,
	) {
		if (!addedSkillIds.value.includes(recommendedSkillId)) {
			addedSkillIds.value = [...addedSkillIds.value, recommendedSkillId];
		}
		telemetry.track(
			TELEMETRY_EVENT.CONTEXT.USER_ADDED_RECOMMENDED_SKILL,
			getExperimentTelemetryPayload(
				RECOMMENDED_SKILLS_EXPERIMENT,
				RECOMMENDED_SKILLS_EXPERIMENT.variant,
				{
					recommended_skill_id: recommendedSkillId,
					...(skillId ? { skill_id: skillId } : {}),
					entry_point: entryPoint,
				},
			),
		);
	}

	return {
		showRecommendedSkills,
		hasVariant,
		addedSkillIds,
		trackExposure,
		trackCardsShown,
		trackSkillAdded,
	};
}
