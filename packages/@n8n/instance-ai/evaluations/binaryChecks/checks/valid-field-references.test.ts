import { validFieldReferences } from './valid-field-references';
import type { WorkflowResponse } from '../../clients/n8n-client';

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
});
