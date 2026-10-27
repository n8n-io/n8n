import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';
import { getEventValidationError } from '../validate';

const FIXTURE = defineTelemetryEvents({
	USER_CLICKED_EXECUTE_WORKFLOW: {
		name: 'User clicked execute workflow button',
		description: 'Fires when the user clicks the execute workflow button.',
		properties: z.object({
			workflow_id: z.string(),
			source: z.enum(['canvas', 'ndv']),
			push_ref: z.string().optional(),
		}),
	},
	USER_CREATED_CREDENTIAL: {
		name: 'User created credential',
		description: 'Fires when the user creates a credential.',
		properties: z.looseObject({
			credential_type: z.string(),
			context: z.looseObject({ source: z.string() }).optional(),
			metadata: z.object({}).catchall(z.unknown()).optional(),
		}),
	},
	USER_OPENED_PANEL: {
		name: 'User opened panel',
		description: 'Fires when the user opens a panel.',
		properties: z.object({
			context: z.object({ source: z.string() }),
			items: z.array(z.object({ item_id: z.string() })).optional(),
		}),
	},
});

describe('getEventValidationError', () => {
	it('returns null when properties match the schema', () => {
		const error = getEventValidationError(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW, {
			workflow_id: 'wf-1',
			source: 'canvas',
		});

		expect(error).toBeNull();
	});

	it('reports wrongly typed properties with their path', () => {
		const error = getEventValidationError(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW, {
			workflow_id: 123,
			source: 'canvas',
		});

		expect(error).toContain('User clicked execute workflow button');
		expect(error).toContain('workflow_id');
	});

	it('reports missing required properties', () => {
		const error = getEventValidationError(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW, {
			source: 'canvas',
		});

		expect(error).toContain('workflow_id');
	});

	it('reports unrecognized properties on plain object schemas', () => {
		const error = getEventValidationError(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW, {
			workflow_id: 'wf-1',
			source: 'canvas',
			extra_junk: 1,
		});

		expect(error).toContain('extra_junk: unrecognized property');
	});

	it('reports unrecognized properties inside nested objects', () => {
		const error = getEventValidationError(FIXTURE.USER_OPENED_PANEL, {
			context: { source: 'canvas', typo: true },
		});

		expect(error).toContain('context.typo: unrecognized property');
	});

	it('reports unrecognized properties inside arrays', () => {
		const error = getEventValidationError(FIXTURE.USER_OPENED_PANEL, {
			context: { source: 'canvas' },
			items: [{ item_id: 'item-1', typo: true }],
		});

		expect(error).toContain('items.0.typo: unrecognized property');
	});

	it('allows extra properties on intentionally loose schemas', () => {
		const error = getEventValidationError(FIXTURE.USER_CREATED_CREDENTIAL, {
			credential_type: 'notionApi',
			context: { source: 'canvas', anything_nested: true },
			metadata: { anything_dynamic: true },
			anything_else: true,
		});

		expect(error).toBeNull();
	});

	it('reports instead of throwing when properties are not an object at all', () => {
		expect(() =>
			getEventValidationError(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW, undefined),
		).not.toThrow();
		expect(getEventValidationError(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW, undefined)).toContain(
			'failed schema validation',
		);
	});
});
