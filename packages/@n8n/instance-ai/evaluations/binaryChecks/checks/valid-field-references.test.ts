import { discoverOutputSchemaForNode, type JsonSchema } from '@n8n/workflow-sdk';

import { validFieldReferences } from './valid-field-references';
import type { WorkflowResponse } from '../../clients/n8n-client';

vi.mock('@n8n/workflow-sdk', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/workflow-sdk')>()),
	discoverOutputSchemaForNode: vi.fn(),
}));

function leadToSet(expression: string): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Lead',
		active: false,
		versionId: 'v1',
		nodes: [
			// A Set node that keeps only its own fields has a statically known output: `body`.
			{
				name: 'Lead',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				parameters: {
					include: 'none',
					assignments: { assignments: [{ name: 'body', value: '={{ {} }}' }] },
				},
			},
			{ name: 'Code', type: 'n8n-nodes-base.code', typeVersion: 2, parameters: {} },
			{
				name: 'Normalize',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				parameters: { assignments: { assignments: [{ name: 'email', value: expression }] } },
			},
		],
		connections: { Lead: { main: [[{ node: 'Normalize', type: 'main', index: 0 }]] } },
	};
}

describe('validFieldReferences', () => {
	it('passes when the field exists in the upstream output', async () => {
		const result = await validFieldReferences.run(leadToSet('={{ $json.body.email }}'), {
			prompt: '',
		});

		expect(result.pass).toBe(true);
	});

	it('fails when the field does not exist in the upstream output', async () => {
		const result = await validFieldReferences.run(leadToSet('={{ $json.email }}'), {
			prompt: '',
		});

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('"email" not in output of "Lead"');
	});

	it('passes when a missing field is only a fallback for a field that exists', async () => {
		const result = await validFieldReferences.run(
			leadToSet('={{ ($json.body?.email ?? $json.email ?? "").trim() }}'),
			{ prompt: '' },
		);

		expect(result.pass).toBe(true);
	});

	it('passes when the existing field is the fallback after `||`', async () => {
		const result = await validFieldReferences.run(
			leadToSet('={{ $json.email || $json.body.email }}'),
			{
				prompt: '',
			},
		);

		expect(result.pass).toBe(true);
	});

	it.each(['={{ $json.email?.[0] ?? $json.body }}', '={{ $json.email?.() ?? $json.body }}'])(
		'passes when a missing field read with optional bracket or call access has a fallback: %s',
		async (expression) => {
			const result = await validFieldReferences.run(leadToSet(expression), { prompt: '' });

			expect(result.pass).toBe(true);
		},
	);

	it('fails when every alternative in the fallback chain is missing', async () => {
		const result = await validFieldReferences.run(
			leadToSet('={{ $json.email ?? $json.mail ?? "" }}'),
			{ prompt: '' },
		);

		expect(result.pass).toBe(false);
	});
	it('fails when the missing field is read further before the fallback', async () => {
		const result = await validFieldReferences.run(
			leadToSet('={{ $json.email.address ?? $json.body }}'),
			{ prompt: '' },
		);

		expect(result.pass).toBe(false);
	});

	it('fails when a separate fallback chain has every alternative missing', async () => {
		const result = await validFieldReferences.run(
			leadToSet('={{ ($json.body ?? $json.lead) + ($json.email ?? $json.mail) }}'),
			{ prompt: '' },
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('"email"');
		expect(result.comment).not.toContain('"lead"');
	});

	it('fails when the only other alternative cannot be checked', async () => {
		const result = await validFieldReferences.run(
			leadToSet('={{ $json.email ?? $("Code").item.json.email }}'),
			{ prompt: '' },
		);

		expect(result.pass).toBe(false);
	});

	describe('with a node output schema', () => {
		const FORM_SCHEMA_BASE = {
			type: 'object',
			properties: { submittedAt: { type: 'string' } },
		} satisfies JsonSchema;

		function formToSet(schema: JsonSchema, expression: string): WorkflowResponse {
			vi.mocked(discoverOutputSchemaForNode).mockReturnValue(schema);
			return {
				id: 'wf-2',
				name: 'Feedback',
				active: false,
				versionId: 'v1',
				nodes: [
					{
						name: 'Feedback Form',
						type: 'n8n-nodes-base.formTrigger',
						typeVersion: 2.2,
						parameters: {},
					},
					{
						name: 'Store',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						parameters: { assignments: { assignments: [{ name: 'name', value: expression }] } },
					},
				],
				connections: {
					'Feedback Form': { main: [[{ node: 'Store', type: 'main', index: 0 }]] },
				},
			};
		}

		const run = async (schema: JsonSchema, expression: string) =>
			await validFieldReferences.run(formToSet(schema, expression), { prompt: '' });

		it('passes for an unlisted field when additionalProperties is true', async () => {
			const result = await run(
				{ ...FORM_SCHEMA_BASE, additionalProperties: true },
				'={{ $json.Name }}',
			);

			expect(result.pass).toBe(true);
		});

		it('passes for an unlisted field when additionalProperties is a schema', async () => {
			const result = await run(
				{ ...FORM_SCHEMA_BASE, additionalProperties: { type: 'string' } },
				'={{ $("Feedback Form").item.json["Name"] }}',
			);

			expect(result.pass).toBe(true);
		});

		it('fails for an unlisted field when the schema is closed', async () => {
			const result = await run(FORM_SCHEMA_BASE, '={{ $json.Name }}');

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('"Name" not in output of "Feedback Form"');
		});

		it('passes for a listed field when the schema is closed', async () => {
			const result = await run(FORM_SCHEMA_BASE, '={{ $json.submittedAt }}');

			expect(result.pass).toBe(true);
		});

		const RECORD_SCHEMA = {
			type: 'object',
			properties: {
				id: { type: 'string' },
				fields: {
					type: 'object',
					properties: { Status: { type: 'string' } },
					additionalProperties: true,
				},
				meta: { type: 'object', properties: { source: { type: 'string' } } },
			},
		} satisfies JsonSchema;

		it('passes for an unlisted field inside a nested open object', async () => {
			const result = await run(RECORD_SCHEMA, '={{ $json.fields.Name }}');

			expect(result.pass).toBe(true);
		});

		it('passes for an unlisted field inside a nested closed object', async () => {
			const result = await run(RECORD_SCHEMA, '={{ $json.meta.author }}');

			expect(result.pass).toBe(true);
		});

		it('passes for a nested field that the sample schema does not list', async () => {
			const issueSchema = {
				type: 'object',
				properties: {
					key: { type: 'string' },
					fields: { type: 'object', properties: { summary: { type: 'string' } } },
				},
			} satisfies JsonSchema;

			const result = await run(issueSchema, '={{ $json.fields.description }}');

			expect(result.pass).toBe(true);
		});

		it('does not count an unlisted nested field as a fallback for a missing field', async () => {
			const result = await run(RECORD_SCHEMA, '={{ $json.author ?? $json.meta.author }}');

			expect(result.pass).toBe(false);
			expect(result.comment).toContain('"author" not in output of "Feedback Form"');
			expect(result.comment).not.toContain('meta.author');
		});

		it('passes for a listed field inside a nested closed object', async () => {
			const result = await run(RECORD_SCHEMA, '={{ $json.meta.source.trim() }}');

			expect(result.pass).toBe(true);
		});

		it('passes when a method call follows a listed field', async () => {
			const result = await run(RECORD_SCHEMA, '={{ $json.meta.hasOwnProperty("x") }}');

			expect(result.pass).toBe(true);
		});
	});
});
