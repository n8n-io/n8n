import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EXPERIMENTS_TO_TRACK, RECOMMENDED_SKILLS_EXPERIMENT } from '@/app/constants/experiments';

import { useRecommendedSkillsExperiment } from './useRecommendedSkillsExperiment';

const getVariant = vi.fn();
const trackExposure = vi.fn();
const track = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({ getVariant, trackExposure })),
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
	});

	it.each(['control', 'variant'])('returns the %s variant', (assigned) => {
		getVariant.mockReturnValue(assigned);

		expect(useRecommendedSkillsExperiment().variant.value).toBe(assigned);
		expect(getVariant).toHaveBeenCalledWith(RECOMMENDED_SKILLS_EXPERIMENT.name);
	});

	it.each([undefined, false, true, 'unknown'])(
		'returns no variant for the flag value %s',
		(assigned) => {
			getVariant.mockReturnValue(assigned);

			expect(useRecommendedSkillsExperiment().variant.value).toBeUndefined();
		},
	);

	it.each([
		['variant', true],
		['control', false],
		[undefined, false],
	])('shows the recommended skills for the flag value %s: %s', (assigned, expected) => {
		getVariant.mockReturnValue(assigned);

		expect(useRecommendedSkillsExperiment().showRecommendedSkills.value).toBe(expected);
	});

	it.each(['control', 'variant'])('tracks the exposure of the %s variant', (assigned) => {
		getVariant.mockReturnValue(assigned);

		useRecommendedSkillsExperiment().trackExposure();

		expect(trackExposure).toHaveBeenCalledWith(RECOMMENDED_SKILLS_EXPERIMENT.name);
	});

	it('tracks no exposure without a variant', () => {
		getVariant.mockReturnValue(undefined);

		useRecommendedSkillsExperiment().trackExposure();

		expect(trackExposure).not.toHaveBeenCalled();
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

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(RECOMMENDED_SKILLS_EXPERIMENT.name);
	});
});
