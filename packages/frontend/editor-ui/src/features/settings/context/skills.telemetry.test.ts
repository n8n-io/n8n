import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { usePostHog } from '@/app/stores/posthog.store';
import { RECOMMENDED_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { validate } from 'uuid';
import { skillNavigationQuery, useSkillTelemetry } from './skills.telemetry';

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));

beforeEach(() => {
	track.mockReset();
	createTestingPinia();
	mockedStore(usePostHog).isVariantEnabled.mockReturnValue(true);
});

it('keeps the navigation origin and visit ID through each add flow', () => {
	const query = skillNavigationQuery('agent_picker_discover');
	const visit = useSkillTelemetry(query.skillsFrom);
	const attribution = visit.startAdding('discover_detail', { catalog_skill_id: 'n8n-workflows' });
	expect(validate(attribution!.flow_id)).toBe(true);
	expect(attribution).toEqual({
		...visit.context,
		navigation_source: 'agent_picker_discover',
		add_entry_point: 'discover_detail',
		catalog_skill_id: 'n8n-workflows',
	});
	expect(track).toHaveBeenCalledExactlyOnceWith(TELEMETRY_EVENT.CONTEXT.USER_STARTED_ADDING_SKILL, {
		...attribution,
		variant: 'variant',
		'$feature/143_recommended_skills': 'variant',
	});
	expect(visit.startAdding('skills_create_menu')?.flow_id).toBe(attribution!.flow_id);
	expect(useSkillTelemetry(query.skillsFrom).context.flow_id).not.toBe(attribution!.flow_id);
});

it.each([undefined, ['agent_picker'], 'https://example.test/private'])(
	'bounds an unknown origin: %s',
	(source) => {
		expect(useSkillTelemetry(source).context.navigation_source).toBe('direct_or_unknown');
	},
);

it('continues the add flow when telemetry throws', () => {
	track.mockImplementation(() => {
		throw new Error('unavailable');
	});
	expect(useSkillTelemetry('context_settings').startAdding('skills_empty_state')).toMatchObject({
		navigation_source: 'context_settings',
		add_entry_point: 'skills_empty_state',
	});
});

it.each([undefined, false, true, 'control'])(
	'does not track or pass attribution for %s',
	(variant) => {
		mockedStore(usePostHog).isVariantEnabled.mockImplementation(
			(name, expected) => name === RECOMMENDED_SKILLS_EXPERIMENT.name && variant === expected,
		);
		const visit = useSkillTelemetry('agent_picker');
		visit.track(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILL_CATALOG, {
			...visit.context,
			catalog_version: '2026-11-23',
		});
		expect(visit.startAdding('agent_picker')).toBeUndefined();
		expect(track).not.toHaveBeenCalled();
	},
);
