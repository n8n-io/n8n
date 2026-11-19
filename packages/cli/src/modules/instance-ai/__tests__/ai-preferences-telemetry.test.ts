import type { AiPreferencesAppliedPayload } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { buildPreferencesAppliedTelemetry } from '../ai-preferences-telemetry';

const turn = { userId: 'user-1', threadId: 'thread-1', runId: 'run-1', latencyMs: 1200 };

const injected: AiPreferencesAppliedPayload = {
	preferences: [
		{ id: 'pref-1', scope: 'instance' },
		{ id: 'pref-2', scope: 'user' },
		{ id: 'pref-3', scope: 'project', projectId: 'project-1' },
		{ id: 'pref-4', scope: 'project', projectId: 'project-2' },
	],
	renderedLength: 420,
	injectedThisTurn: true,
};

describe('buildPreferencesAppliedTelemetry', () => {
	it('should report the thread, run and preference ids of an injecting turn', () => {
		const properties = buildPreferencesAppliedTelemetry(injected, { ...turn, promptTokens: 900 });

		expect(properties).toEqual({
			user_id: 'user-1',
			thread_id: 'thread-1',
			run_id: 'run-1',
			count: 4,
			preference_ids: ['pref-1', 'pref-2', 'pref-3', 'pref-4'],
			scope_types: ['instance', 'user', 'project'],
			rendered_length: 420,
			surface: 'aia',
			injected_this_turn: true,
			turn_latency_ms: 1200,
			turn_token_count: 900,
		});
		expect(
			TELEMETRY_EVENT.CONTEXT.PREFERENCES_APPLIED_TO_TURN.properties.strict().safeParse(properties)
				.success,
		).toBe(true);
	});

	it('should leave out the token count when the turn reported no usage', () => {
		expect(buildPreferencesAppliedTelemetry(injected, turn)).not.toHaveProperty('turn_token_count');
	});

	it('should send nothing when the turn applied no preferences', () => {
		expect(
			buildPreferencesAppliedTelemetry(
				{ preferences: [], renderedLength: 0, injectedThisTurn: true },
				turn,
			),
		).toBeUndefined();
	});

	it('should send nothing when an earlier turn already carries the block', () => {
		expect(
			buildPreferencesAppliedTelemetry({ ...injected, injectedThisTurn: false }, turn),
		).toBeUndefined();
	});
});
