import { z } from 'zod/v4';

import { buildCatalog, formatCatalog } from '../catalog';
import { defineTelemetryEvents } from '../define';

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
