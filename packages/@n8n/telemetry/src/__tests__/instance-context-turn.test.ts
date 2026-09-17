import { INSTANCE_AI_TELEMETRY } from '../events/instance-ai';

const segment = {
	user_id: 'user-1',
	run_id: 'run-1',
	segment: 'whole',
	instance_context_enabled: false,
	node_usage_enabled: false,
	block_state: 'absent',
	context_depth: 0,
	context_surfaces: [],
	asked_clarifying_question: false,
	tool_calls: 0,
	status: 'completed',
};

describe('instance context turn properties', () => {
	afterEach(() => {
		vi.doUnmock('@n8n/api-types');
		vi.resetModules();
	});

	it.each(['aia', 'mcp'])('accepts the assistant surface %s', (surface) => {
		expect(
			INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN.getValidationError({ ...segment, surface }),
		).toBeNull();
	});

	it.each([undefined, 'ui', false])('rejects an invalid assistant surface: %s', (surface) => {
		expect(
			INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN.properties.safeParse({ ...segment, surface })
				.success,
		).toBe(false);
	});

	it('uses new absence reasons from the shared schema', async () => {
		vi.resetModules();
		vi.doMock('@n8n/api-types', async (importOriginal) => {
			const apiTypes = await importOriginal<typeof import('@n8n/api-types')>();
			const { z } = await import('zod');
			return {
				...apiTypes,
				instanceContextAbsenceReasonSchema: z.enum([
					...apiTypes.instanceContextAbsenceReasonSchema.options,
					'new-absence-reason',
				]),
			};
		});
		const { INSTANCE_AI_TELEMETRY: telemetry } = await import('../events/instance-ai.js');

		expect(
			telemetry.INSTANCE_CONTEXT_TURN.getValidationError({
				...segment,
				surface: 'aia',
				absence_reason: 'new-absence-reason',
			}),
		).toBeNull();
	});
});
