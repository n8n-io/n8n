import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';
import { collectDuplicateNames, validateEntrySchemas } from '../registry-checks';
import { TELEMETRY_EVENT } from '../telemetry-events';

const WORKFLOWS_FIXTURE = defineTelemetryEvents({
	USER_CREATED_WORKFLOW: {
		name: 'User created workflow',
		description: 'Fires when the user creates a workflow.',
		properties: z.object({ workflow_id: z.string() }),
	},
	USER_DELETED_WORKFLOW: {
		name: 'User deleted workflow',
		description: 'Fires when the user deletes a workflow.',
		properties: z.object({ workflow_id: z.string(), source: z.enum(['canvas', 'list']) }),
	},
});

const CREDENTIALS_FIXTURE = defineTelemetryEvents({
	USER_CREATED_CREDENTIAL: {
		name: 'User created credential',
		description: 'Fires when the user creates a credential.',
		properties: z.looseObject({ credential_type: z.string().optional() }),
	},
});

describe('collectDuplicateNames', () => {
	it('returns nothing when every name is unique across domains', () => {
		const duplicates = collectDuplicateNames({
			WORKFLOWS: WORKFLOWS_FIXTURE,
			CREDENTIALS: CREDENTIALS_FIXTURE,
		});

		expect(duplicates).toEqual([]);
	});

	it('detects the same name registered in two domains', () => {
		const CLASHING_FIXTURE = defineTelemetryEvents({
			USER_CREATED_WORKFLOW_FROM_TEMPLATE: {
				name: 'User created workflow',
				description: 'Fires when the user creates a workflow from a template.',
				properties: z.object({ template_id: z.string() }),
			},
		});

		const duplicates = collectDuplicateNames({
			WORKFLOWS: WORKFLOWS_FIXTURE,
			TEMPLATES: CLASHING_FIXTURE,
		});

		expect(duplicates).toEqual(['User created workflow']);
	});

	it('detects the same name registered twice within one domain', () => {
		const DOUBLED_FIXTURE = defineTelemetryEvents({
			USER_OPENED_MODAL: {
				name: 'User opened modal',
				description: 'Fires when the user opens a modal.',
				properties: z.object({}),
			},
			USER_OPENED_MODAL_AGAIN: {
				name: 'User opened modal',
				description: 'Fires when the user opens a modal.',
				properties: z.object({}),
			},
		});

		expect(collectDuplicateNames({ MODALS: DOUBLED_FIXTURE })).toEqual(['User opened modal']);
	});
});

describe('validateEntrySchemas', () => {
	it('accepts documented object and loose-object schemas', () => {
		const errors = validateEntrySchemas({
			WORKFLOWS: WORKFLOWS_FIXTURE,
			CREDENTIALS: CREDENTIALS_FIXTURE,
		});

		expect(errors).toEqual([]);
	});

	it('accepts a union of object schemas', () => {
		const UNION_FIXTURE = defineTelemetryEvents({
			USER_FINISHED_ACTION: {
				name: 'User finished action',
				description: 'Fires when an action ends.',
				properties: z.discriminatedUnion('status', [
					z.object({ status: z.literal('success'), count: z.number() }),
					z.object({ status: z.literal('error'), reason: z.string() }),
				]),
			},
		});

		expect(validateEntrySchemas({ ACTIONS: UNION_FIXTURE })).toEqual([]);
	});

	it('rejects a union with a non-object member', () => {
		const UNION_FIXTURE = defineTelemetryEvents({
			USER_FINISHED_ACTION: {
				name: 'User finished action',
				description: 'Fires when an action ends.',
				properties: z.union([z.object({ count: z.number() }), z.string()]),
			},
		});

		expect(validateEntrySchemas({ ACTIONS: UNION_FIXTURE })).toEqual([
			expect.stringContaining('must be a zod object schema or a union of object schemas'),
		]);
	});

	it('rejects an entry whose properties are not an object schema', () => {
		const BROKEN_FIXTURE = defineTelemetryEvents({
			BAD_ENTRY: {
				name: 'Bad entry',
				description: 'Fires when a bad entry is tested.',
				properties: z.string(),
			},
		});

		const errors = validateEntrySchemas({ BROKEN: BROKEN_FIXTURE });

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('BROKEN.BAD_ENTRY');
		expect(errors[0]).toContain('must be a zod object schema');
	});

	it('rejects an entry whose description is blank', () => {
		const BROKEN_FIXTURE = defineTelemetryEvents({
			BLANK_ENTRY: {
				name: 'Blank entry',
				description: '   ',
				properties: z.object({ workflow_id: z.string() }),
			},
		});

		const errors = validateEntrySchemas({ BROKEN: BROKEN_FIXTURE });

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('BROKEN.BLANK_ENTRY');
		expect(errors[0]).toContain('description must not be empty');
	});

	it('rejects an entry whose schema cannot be represented as JSON Schema', () => {
		const BROKEN_FIXTURE = defineTelemetryEvents({
			DATED_ENTRY: {
				name: 'Dated entry',
				description: 'Fires when something dated happens.',
				properties: z.object({ happened_at: z.date() }),
			},
		});

		const errors = validateEntrySchemas({ BROKEN: BROKEN_FIXTURE });

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('BROKEN.DATED_ENTRY');
		expect(errors[0]).toContain('not JSON-Schema-representable');
	});
});

describe('TELEMETRY_EVENT', () => {
	it('has no duplicate event names', () => {
		expect(collectDuplicateNames(TELEMETRY_EVENT)).toEqual([]);
	});

	it('has a documented, JSON-Schema-representable schema on every entry', () => {
		expect(validateEntrySchemas(TELEMETRY_EVENT)).toEqual([]);
	});

	it.each([
		TELEMETRY_EVENT.AGENTS.USER_REVERTED_CHANGES_ON_AGENT,
		TELEMETRY_EVENT.AGENTS.USER_CLICKED_TRACE_DETAILS_FROM_TEST_PANEL,
	])('requires an agent id and editor push ref for $name', (event) => {
		const payload = { agent_id: 'agent-1', push_ref: 'editor-session' };
		expect(event.properties.parse(payload)).toEqual(payload);
		expect(event.properties.safeParse({ agent_id: 'agent-1' }).success).toBe(false);
		expect(event.properties.safeParse({ push_ref: 'editor-session' }).success).toBe(false);
		expect(event.properties.safeParse({ ...payload, push_ref: 42 }).success).toBe(false);
		expect(
			event.properties.safeParse({ agent_id: 'agent-1', session_id: 'editor-session' }).success,
		).toBe(false);
		expect(event.getValidationError({ ...payload, session_id: 'editor-session' })).not.toBeNull();
	});

	it.each([
		{ payload: { agent_id: 'agent-1' }, valid: true },
		{ payload: { agent_id: 'agent-1', source: 'icon' }, valid: true },
		{ payload: { agent_id: 'agent-1', source: 'primary' }, valid: true },
		{ payload: { agent_id: 'agent-1', source: 'unknown' }, valid: false },
	])('validates preview button attribution: $payload', ({ payload, valid }) => {
		const result = TELEMETRY_EVENT.AGENTS.USER_OPENED_AGENT_PREVIEW.properties.safeParse(payload);
		expect(result.success).toBe(valid);
		if (result.success) expect(result.data).toEqual(payload);
	});

	it('validates user setting changes and keeps legacy modification payloads valid', () => {
		const schema = TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT.properties;
		const legacyPayload = {
			agent_id: 'agent-1',
			project_id: 'project-1',
			user_id: 'user-1',
			changed_parts: ['config'],
			capability_kinds: [],
			capability_count: 0,
			tool_count: 0,
			skill_count: 0,
			sub_agent_count: 0,
			mcp_server_count: 0,
			vector_store_count: 0,
			task_count: 0,
			trigger_count: 0,
			model: null,
			tool_types: [],
			has_published_version: false,
			event_version: '2',
		};
		const changedSettings = [
			'monthly_budget',
			'budget_alert',
			'session_cost_cap',
			'custom_model_routing',
			'memory_model',
			'cache_duration',
			'tool_concurrency',
			'max_iterations',
		];

		expect(schema.safeParse(legacyPayload).success).toBe(true);
		expect(schema.safeParse({ ...legacyPayload, changed_settings: [] }).success).toBe(true);
		expect(schema.safeParse({ ...legacyPayload, changed_settings: changedSettings }).success).toBe(
			true,
		);
		expect(
			schema.safeParse({ ...legacyPayload, changed_settings: ['unknown_setting'] }).success,
		).toBe(false);
	});

	it('composes every domain file under src/events/', () => {
		const eventsDir = join(process.cwd(), 'src', 'events');
		const domainsFromFiles = readdirSync(eventsDir)
			.filter((file) => file.endsWith('.ts'))
			.map((file) => file.replace(/\.ts$/, '').replaceAll('-', '_').toUpperCase())
			.sort();

		expect(Object.keys(TELEMETRY_EVENT).sort()).toEqual(domainsFromFiles);
	});
});
