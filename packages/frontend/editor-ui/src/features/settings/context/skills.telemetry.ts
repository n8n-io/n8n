import { v4 as uuid } from 'uuid';
import { skillNavigationSourceSchema, type SkillTelemetryContext } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT, type InferTelemetryProps, type TelemetryEventDef } from '@n8n/telemetry';
import { RECOMMENDED_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';

export function skillNavigationQuery(source: SkillTelemetryContext['navigation_source']) {
	return { skillsFrom: source };
}

export function useSkillTelemetry(source: unknown) {
	const telemetry = useTelemetry();
	const posthog = usePostHog();
	const isEnabled = () =>
		posthog.isVariantEnabled(
			RECOMMENDED_SKILLS_EXPERIMENT.name,
			RECOMMENDED_SKILLS_EXPERIMENT.variant,
		);
	const parsed = skillNavigationSourceSchema.safeParse(source);
	const context: SkillTelemetryContext = {
		navigation_source: parsed.success ? parsed.data : 'direct_or_unknown',
		flow_id: uuid(),
	};

	function track<T extends TelemetryEventDef>(event: T, properties: InferTelemetryProps<T>) {
		try {
			if (!isEnabled()) return;
			telemetry.track(
				event,
				getExperimentTelemetryPayload(
					RECOMMENDED_SKILLS_EXPERIMENT,
					RECOMMENDED_SKILLS_EXPERIMENT.variant,
					properties,
				),
			);
		} catch {
			// Telemetry must not interrupt browsing or saving a skill.
		}
	}

	function startAdding(
		entryPoint: NonNullable<SkillTelemetryContext['add_entry_point']>,
		selection: Pick<SkillTelemetryContext, 'catalog_skill_id' | 'recommended_skill_id'> = {},
	) {
		if (!isEnabled()) return undefined;
		const attribution = { ...context, add_entry_point: entryPoint, ...selection };
		track(TELEMETRY_EVENT.CONTEXT.USER_STARTED_ADDING_SKILL, attribution);
		return attribution;
	}

	return { context, track, startAdding };
}
