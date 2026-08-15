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

	it('composes every domain file under src/events/', () => {
		const eventsDir = join(process.cwd(), 'src', 'events');
		const domainsFromFiles = readdirSync(eventsDir)
			.filter((file) => file.endsWith('.ts'))
			.map((file) => file.replace(/\.ts$/, '').replaceAll('-', '_').toUpperCase())
			.sort();

		expect(Object.keys(TELEMETRY_EVENT).sort()).toEqual(domainsFromFiles);
	});
});
