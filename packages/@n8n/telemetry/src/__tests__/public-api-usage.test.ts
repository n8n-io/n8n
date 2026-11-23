import { PUBLIC_API_TELEMETRY, PUBLIC_API_USAGE_JSON_FIELDS } from '../events/public-api';

const { PUBLIC_API_USAGE } = PUBLIC_API_TELEMETRY;

const report = {
	user_id: 'user-1',
	total_calls: 3,
	first: '2026-11-16T10:00:00.000Z',
	endpoints: JSON.stringify({ 'GET /workflows/{workflowId}': 2, 'GET /executions': 1 }),
	endpoints_by_client: JSON.stringify({
		editor_ui: { 'GET /executions': 1 },
		n8n_node: {},
		n8n_cli: { 'GET /workflows/{workflowId}': 1 },
	}),
	routes: JSON.stringify([
		{ route: 'GET /workflows/{workflowId}', result: '2xx', caller: 'n8n_cli', calls: 1 },
		{ route: 'GET /workflows/{workflowId}', result: '4xx', caller: 'other', calls: 1 },
		{ route: 'GET /executions', result: '2xx', caller: 'editor_ui', calls: 1 },
	]),
	user_agents: JSON.stringify({ 'n8n-cli/1.0': 3 }),
	clients: JSON.stringify({ editor_ui: 1, n8n_node: 0, n8n_cli: 1, other: 1 }),
};

type JsonField = keyof typeof PUBLIC_API_USAGE_JSON_FIELDS;

describe('Public API usage', () => {
	it('accepts a complete report', () => {
		expect(PUBLIC_API_USAGE.getValidationError(report)).toBeNull();
	});

	it.each(Object.keys(PUBLIC_API_USAGE_JSON_FIELDS) as JsonField[])(
		'describes the JSON text in %s',
		(field) => {
			const parsed = PUBLIC_API_USAGE_JSON_FIELDS[field].safeParse(JSON.parse(report[field]));

			expect(parsed.success).toBe(true);
		},
	);

	it('rejects a route row with a result outside 2xx, 4xx and 5xx', () => {
		const row = { route: 'GET /workflows', result: '3xx', caller: 'other', calls: 1 };

		expect(PUBLIC_API_USAGE_JSON_FIELDS.routes.safeParse([row]).success).toBe(false);
	});
});
