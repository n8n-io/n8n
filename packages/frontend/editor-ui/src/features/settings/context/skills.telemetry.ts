import { v4 as uuid } from 'uuid';
import { skillNavigationSourceSchema, type SkillTelemetryContext } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT, type InferTelemetryProps, type TelemetryEventDef } from '@n8n/telemetry';

export function skillNavigationQuery(source: SkillTelemetryContext['navigation_source']) {
	return { skillsFrom: source };
}

export function useSkillTelemetry(source: unknown) {
	const telemetry = useTelemetry();
	const parsed = skillNavigationSourceSchema.safeParse(source);
	const context: SkillTelemetryContext = {
		navigation_source: parsed.success ? parsed.data : 'direct_or_unknown',
		flow_id: uuid(),
	};

	function track<T extends TelemetryEventDef>(event: T, properties: InferTelemetryProps<T>) {
		try {
			telemetry.track(event, properties);
		} catch {
			// Telemetry must not interrupt browsing or saving a skill.
		}
	}

	function startAdding(
		entryPoint: NonNullable<SkillTelemetryContext['add_entry_point']>,
		selection: Pick<SkillTelemetryContext, 'catalog_skill_id' | 'recommended_skill_id'> = {},
	) {
		const attribution = { ...context, add_entry_point: entryPoint, ...selection };
		track(TELEMETRY_EVENT.CONTEXT.USER_STARTED_ADDING_SKILL, attribution);
		return attribution;
	}

	return { context, track, startAdding };
}
