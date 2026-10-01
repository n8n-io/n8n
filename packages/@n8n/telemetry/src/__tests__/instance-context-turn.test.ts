import { INSTANCE_AI_TELEMETRY } from '../events/instance-ai';

const segment = {
	surface: 'aia',
	user_id: 'user-1',
	run_id: 'run-1',
	segment: 'whole',
	instance_context_enabled: false,
	node_usage_enabled: false,
	context_depth: 0,
	context_surfaces: [],
	asked_clarifying_question: false,
	tool_calls: 0,
	status: 'completed',
};

const absentSegment = { ...segment, block_state: 'absent', absence_reason: 'disabled' };
const injectedSegment = {
	...segment,
	block_state: 'injected',
	block_is_update: false,
	block_inventory_rows: 2,
	block_event_rows: 3,
	block_run_rows: 1,
	block_chars: 120,
	block_tokens_estimated: 30,
};

const blockFields = [
	'block_is_update',
	'block_inventory_rows',
	'block_event_rows',
	'block_run_rows',
	'block_chars',
	'block_tokens_estimated',
] as const;

describe('instance context turn properties', () => {
	afterEach(() => {
		vi.doUnmock('@n8n/api-types');
		vi.resetModules();
	});

	it.each(['aia', 'mcp'])('accepts the assistant surface %s', (surface) => {
		expect(
			INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN.getValidationError({ ...absentSegment, surface }),
		).toBeNull();
	});

	it.each([undefined, 'ui', false])('rejects an invalid assistant surface: %s', (surface) => {
		expect(
			INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN.properties.safeParse({
				...absentSegment,
				surface,
			}).success,
		).toBe(false);
	});

	it('accepts a complete injected block', () => {
		expect(
			INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN.getValidationError(injectedSegment),
		).toBeNull();
	});

	it('requires a reason when the block is absent', () => {
		expect(
			INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN.getValidationError({
				...segment,
				block_state: 'absent',
			}),
		).not.toBeNull();
	});

	it.each(blockFields)('rejects %s when the block is absent', (field) => {
		expect(
			INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN.getValidationError({
				...absentSegment,
				[field]: injectedSegment[field],
			}),
		).not.toBeNull();
	});

	it.each(blockFields)('requires %s when the block is injected', (field) => {
		const properties = Object.fromEntries(
			Object.entries(injectedSegment).filter(([key]) => key !== field),
		);

		expect(
			INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN.getValidationError(properties),
		).not.toBeNull();
	});

	it('rejects an absence reason when the block is injected', () => {
		expect(
			INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN.getValidationError({
				...injectedSegment,
				absence_reason: 'empty',
			}),
		).not.toBeNull();
	});

	it.each(['completed', 'cancelled', 'errored', 'suspended'])('accepts status %s', (status) => {
		expect(
			INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN.getValidationError({ ...absentSegment, status }),
		).toBeNull();
	});

	it.each(['complete', 'canceled', 'error', 'interrupted', 'running'])(
		'rejects status %s',
		(status) => {
			expect(
				INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN.getValidationError({
					...absentSegment,
					status,
				}),
			).not.toBeNull();
		},
	);

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
				...absentSegment,
				surface: 'aia',
				absence_reason: 'new-absence-reason',
			}),
		).toBeNull();
	});
});
