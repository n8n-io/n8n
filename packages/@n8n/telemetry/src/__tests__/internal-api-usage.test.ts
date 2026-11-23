import { INTERNAL_API_TELEMETRY, INTERNAL_API_USAGE_JSON_FIELDS } from '../events/internal-api';

const { INTERNAL_API_USAGE } = INTERNAL_API_TELEMETRY;

const report = {
	user_id: 'user-1',
	total_calls: 4,
	first: '2026-11-16T10:00:00.000Z',
	routes: JSON.stringify([
		{ route: 'GET /rest/workflows/{workflowId}', result: '2xx', caller: 'other', calls: 1 },
		{ route: 'GET /rest/workflows/{workflowId}', result: '4xx', caller: 'other', calls: 1 },
		{ route: 'GET /rest/credentials', result: '2xx', caller: 'n8n_node', calls: 1 },
	]),
	clients: JSON.stringify({ editor_ui: 1, n8n_node: 1, other: 2 }),
};

type JsonField = keyof typeof INTERNAL_API_USAGE_JSON_FIELDS;

describe('Internal API usage', () => {
	it('accepts a complete report', () => {
		expect(INTERNAL_API_USAGE.getValidationError(report)).toBeNull();
	});

	it.each(Object.keys(INTERNAL_API_USAGE_JSON_FIELDS) as JsonField[])(
		'describes the JSON text in %s',
		(field) => {
			const parsed = INTERNAL_API_USAGE_JSON_FIELDS[field].safeParse(JSON.parse(report[field]));

			expect(parsed.success).toBe(true);
		},
	);

	it('rejects a route row with a result outside 2xx, 4xx and 5xx', () => {
		const row = { route: 'GET /rest/workflows', result: '3xx', caller: 'other', calls: 1 };

		expect(INTERNAL_API_USAGE_JSON_FIELDS.routes.safeParse([row]).success).toBe(false);
	});

	it('rejects a route row for the Editor UI caller', () => {
		const row = { route: 'GET /rest/workflows', result: '2xx', caller: 'editor_ui', calls: 1 };

		expect(INTERNAL_API_USAGE_JSON_FIELDS.routes.safeParse([row]).success).toBe(false);
	});
});
