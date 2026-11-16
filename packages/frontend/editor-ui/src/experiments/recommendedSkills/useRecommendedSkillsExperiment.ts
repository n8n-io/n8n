import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { RECOMMENDED_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS } from '@/app/constants/localStorage';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';

import type { RecommendedSkillId } from './recommendedSkills';

const RECOMMENDED_SKILLS_VARIANTS = [
	RECOMMENDED_SKILLS_EXPERIMENT.control,
	RECOMMENDED_SKILLS_EXPERIMENT.variant,
] as const;

export type RecommendedSkillsVariant = (typeof RECOMMENDED_SKILLS_VARIANTS)[number];

export type RecommendedSkillsEntryPoint = 'empty_state' | 'create_menu' | 'agent_skill_modal';

function isRecommendedSkillsVariant(value: unknown): value is RecommendedSkillsVariant {
	return RECOMMENDED_SKILLS_VARIANTS.some((variant) => variant === value);
}

export function useRecommendedSkillsExperiment() {
	const posthogStore = usePostHog();
	const telemetry = useTelemetry();
	const addedSkillIds = useLocalStorage<RecommendedSkillId[]>(
		LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS,
		[],
	);

	const variant = computed<RecommendedSkillsVariant | undefined>(() => {
		const assigned = posthogStore.getVariant(RECOMMENDED_SKILLS_EXPERIMENT.name);
		return isRecommendedSkillsVariant(assigned) ? assigned : undefined;
	});

	const showRecommendedSkills = computed(
		() => variant.value === RECOMMENDED_SKILLS_EXPERIMENT.variant,
	);

	function trackExposure() {
		if (!variant.value) return;
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
		variant,
		showRecommendedSkills,
		addedSkillIds,
		trackExposure,
		trackCardsShown,
		trackSkillAdded,
	};
}
