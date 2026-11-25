import { INTERNAL_API_TELEMETRY, INTERNAL_API_USAGE_JSON_FIELDS } from '../events/internal-api';

const { INTERNAL_API_USAGE } = INTERNAL_API_TELEMETRY;

const report = {
	total_calls: 4,
	first: '2026-11-16T10:00:00.000Z',
	routes: JSON.stringify([
		{ route: 'GET /rest/workflows/{workflowId}', calls: 2 },
		{ route: 'GET /rest/credentials', calls: 1 },
	]),
	clients: JSON.stringify({ editor_ui: 1, other: 3 }),
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

	it('accepts a follow-up event that carries route rows and zero totals', () => {
		const followUp = {
			...report,
			total_calls: 0,
			clients: JSON.stringify({ editor_ui: 0, other: 0 }),
		};

		expect(INTERNAL_API_USAGE.getValidationError(followUp)).toBeNull();
	});

	it('rejects a route row without a positive call count', () => {
		const row = { route: 'GET /rest/workflows', calls: 0 };

		expect(INTERNAL_API_USAGE_JSON_FIELDS.routes.safeParse([row]).success).toBe(false);
	});

	it('rejects a clients count without the other client', () => {
		expect(INTERNAL_API_USAGE_JSON_FIELDS.clients.safeParse({ editor_ui: 1 }).success).toBe(false);
	});
});
