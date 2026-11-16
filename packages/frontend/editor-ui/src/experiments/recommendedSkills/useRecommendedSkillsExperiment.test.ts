import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { EXPERIMENTS_TO_TRACK, RECOMMENDED_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS } from '@/app/constants/localStorage';

import { useRecommendedSkillsExperiment } from './useRecommendedSkillsExperiment';

const getVariant = vi.fn();
const trackExposure = vi.fn();
const track = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		isVariantEnabled: (flag: string, variant: string) => getVariant(flag) === variant,
		trackExposure,
	})),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

const experimentProperties = {
	variant: 'variant',
	'$feature/143_recommended_skills': 'variant',
};

describe('useRecommendedSkillsExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
		trackExposure.mockReset();
		track.mockReset();
		localStorage.clear();
	});

	it.each([
		['variant', true],
		['control', false],
		[undefined, false],
	])('shows the recommended skills for the flag value %s: %s', (assigned, expected) => {
		getVariant.mockReturnValue(assigned);

		expect(useRecommendedSkillsExperiment().showRecommendedSkills.value).toBe(expected);
	});

	it('tracks the exposure of the experiment', () => {
		useRecommendedSkillsExperiment().trackExposure();

		expect(trackExposure).toHaveBeenCalledWith(RECOMMENDED_SKILLS_EXPERIMENT.name);
	});

	it('reports the cards shown with the entry point and the variant', () => {
		useRecommendedSkillsExperiment().trackCardsShown('create_menu');

		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_RECOMMENDED_SKILLS, {
			entry_point: 'create_menu',
			...experimentProperties,
		});
	});

	it('reports the added skill with the recommended skill, the new skill and the entry point', () => {
		useRecommendedSkillsExperiment().trackSkillAdded('research', 'skill-1', 'empty_state');

		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_ADDED_RECOMMENDED_SKILL, {
			recommended_skill_id: 'research',
			skill_id: 'skill-1',
			entry_point: 'empty_state',
			...experimentProperties,
		});
	});

	it('reports the added skill without a skill id from the agent skill picker', () => {
		useRecommendedSkillsExperiment().trackSkillAdded('humanizer', undefined, 'agent_skill_modal');

		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_ADDED_RECOMMENDED_SKILL, {
			recommended_skill_id: 'humanizer',
			entry_point: 'agent_skill_modal',
			...experimentProperties,
		});
	});

	it('remembers each added recommended skill once in local storage', async () => {
		const { trackSkillAdded } = useRecommendedSkillsExperiment();
		trackSkillAdded('research', 'skill-1', 'create_menu');
		await nextTick();
		trackSkillAdded('research', 'skill-2', 'create_menu');
		await nextTick();
		trackSkillAdded('humanizer', 'skill-3', 'empty_state');

		expect(track).toHaveBeenCalledTimes(3);

		expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS)!)).toEqual([
			'research',
			'humanizer',
		]);
	});

	it('keeps the skills that another instance added', async () => {
		const first = useRecommendedSkillsExperiment();
		const second = useRecommendedSkillsExperiment();
		first.trackSkillAdded('research', 'skill-1', 'create_menu');
		await nextTick();
		second.trackSkillAdded('humanizer', 'skill-2', 'create_menu');

		expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS)!)).toEqual([
			'research',
			'humanizer',
		]);
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(RECOMMENDED_SKILLS_EXPERIMENT.name);
	});
});
