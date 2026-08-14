import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const FIXTURE = defineTelemetryEvents({
	USER_CLICKED_EXECUTE_WORKFLOW: {
		name: 'User clicked execute workflow button',
		description: 'Fires when the user clicks the execute workflow button.',
		properties: z.object({
			workflow_id: z.string(),
			source: z.enum(['canvas', 'ndv']),
		}),
	},
});

describe('defineTelemetryEvents', () => {
	it('preserves the event definition fields', () => {
		expect(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW.name).toBe('User clicked execute workflow button');
		expect(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW.description).toBe(
			'Fires when the user clicks the execute workflow button.',
		);
	});

	it('attaches a validator that returns null for matching properties', () => {
		expect(
			FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW.getValidationError({
				workflow_id: 'wf-1',
				source: 'canvas',
			}),
		).toBeNull();
	});

	it('attaches a validator that reports schema mismatches', () => {
		const error = FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW.getValidationError({
			workflow_id: 123,
			source: 'canvas',
		});

		expect(error).toContain('User clicked execute workflow button');
		expect(error).toContain('workflow_id');
	});
});
