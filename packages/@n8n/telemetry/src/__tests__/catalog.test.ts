import { z } from 'zod/v4';

import { buildCatalog, formatCatalog } from '../catalog';
import { defineTelemetryEvents } from '../define';
import { INSTANCE_AI_TELEMETRY } from '../events/instance-ai';

const WORKFLOWS_FIXTURE = defineTelemetryEvents({
	USER_CLICKED_EXECUTE_WORKFLOW: {
		name: 'User clicked execute workflow button',
		description: 'User clicked the execute workflow button.',
		properties: z.object({
			workflow_id: z.string().describe('Workflow identifier'),
			source: z.enum(['canvas', 'ndv']),
			push_ref: z.string().optional(),
		}),
	},
});

describe('buildCatalog', () => {
	it('lists every event with its description and property details', () => {
		const catalog = buildCatalog({ WORKFLOWS: WORKFLOWS_FIXTURE });

		expect(catalog).toEqual([
			{
				domain: 'WORKFLOWS',
				key: 'USER_CLICKED_EXECUTE_WORKFLOW',
				name: 'User clicked execute workflow button',
				description: 'User clicked the execute workflow button.',
				deprecated: false,
				properties: [
					{
						name: 'workflow_id',
						type: 'string',
						optional: false,
						description: 'Workflow identifier',
					},
					{ name: 'source', type: '"canvas" | "ndv"', optional: false },
					{ name: 'push_ref', type: 'string', optional: true },
				],
			},
		]);
	});

	it('lists common and conditional properties from object unions', () => {
		const [entry] = buildCatalog({
			INSTANCE_AI: { INSTANCE_CONTEXT_TURN: INSTANCE_AI_TELEMETRY.INSTANCE_CONTEXT_TURN },
		});

		expect(entry.properties).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'surface', type: '"aia" | "mcp"', optional: false }),
				{ name: 'block_state', type: '"absent" | "injected"', optional: false },
				{
					name: 'absence_reason',
					type: '"disabled" | "machine-follow-up" | "empty" | "failed"',
					optional: true,
					description: 'Why this turn received no block',
				},
				{
					name: 'block_chars',
					type: 'integer',
					optional: true,
					description: 'Exact rendered block length',
				},
				{
					name: 'status',
					type: '"completed" | "cancelled" | "errored" | "suspended"',
					optional: false,
					description: 'How this segment ended',
				},
			]),
		);
		expect(entry.properties).toHaveLength(24);
		expect(new Set(entry.properties.map((property) => property.name)).size).toBe(24);
	});
});

describe('buildCatalog deprecation flag', () => {
	it('marks entries whose schema carries deprecated metadata', () => {
		const DEPRECATED_FIXTURE = defineTelemetryEvents({
			USER_USED_LEGACY_FEATURE: {
				name: 'User used legacy feature',
				description: 'Fires when the user touches the legacy feature.',
				properties: z.object({ workflow_id: z.string() }).meta({ deprecated: true }),
			},
		});

		const [entry] = buildCatalog({ LEGACY: DEPRECATED_FIXTURE });

		expect(entry.deprecated).toBe(true);
	});
});

describe('formatCatalog', () => {
	it('renders a grouped human-readable listing', () => {
		const output = formatCatalog(buildCatalog({ WORKFLOWS: WORKFLOWS_FIXTURE }));

		expect(output).toContain('WORKFLOWS');
		expect(output).toContain(
			'User clicked execute workflow button — User clicked the execute workflow button.',
		);
		expect(output).toContain('push_ref?: string');
	});
});
