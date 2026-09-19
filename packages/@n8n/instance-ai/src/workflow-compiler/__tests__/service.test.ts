import { describe, expect, it } from 'vitest';

import { scriptedDecisions } from '../../__tests__/scripted-decisions';
import { WorkflowCompilerService } from '../service';

const REQUEST = [
	'Create an API workflow.',
	'POST /customers',
	'Validate email and company.',
	'Upsert the customer in HubSpot.',
	'If they are new, send a message to #sales.',
	'Also save every request in Postgres table customer_requests.',
	'Respond with the HubSpot contact ID.',
].join('\n');

describe('WorkflowCompilerService.create', () => {
	it('compiles the end-to-end example in one decision wave', async () => {
		const decisions = scriptedDecisions();
		const service = new WorkflowCompilerService({ decisions });
		const result = await service.create({ request: REQUEST });
		expect(result.status).toBe('compiled');
		if (result.status !== 'compiled') return;
		const names = result.workflow.nodes.map((node) => node.name);
		expect(names).toEqual([
			'Webhook',
			'Validate request',
			'Respond 400',
			'Upsert Contact',
			'They are new?',
			'Send Slack Message',
			'Insert Row',
			'Respond',
		]);
		expect(result.workflow.name).toBe('Customers API');
		const byName = new Map(result.workflow.nodes.map((node) => [node.name, node]));
		expect(byName.get('Send Slack Message')?.parameters).toMatchObject({
			channelId: { value: '#sales' },
		});
		expect(byName.get('Insert Row')?.parameters).toMatchObject({
			table: { value: 'customer_requests' },
		});
		expect(byName.get('Respond')?.parameters).toMatchObject({
			responseBody: '={{ ({ "contactId": $("Upsert Contact").item.json.vid }) }}',
		});
		expect(result.report.structural).toBe('pass');
		expect(result.report.expressions).toBe('pass');
		expect(result.report.fixtureTests).toBe('not_run');
		expect(result.executionPaths.length).toBe(3);
		expect(result.diagnostics.decisionWaves).toBeLessThanOrEqual(1);
		expect(decisions.requests.length).toBeLessThanOrEqual(1);
		expect(result.generator.patternIds).toEqual([
			'webhook_request_response',
			'respond_with_result',
		]);
	});

	it('asks a grouped clarification and resumes the session with the answer', async () => {
		const service = new WorkflowCompilerService({ decisions: scriptedDecisions() });
		const first = await service.create({
			request: 'When a POST /leads arrives, notify the sales team in Slack',
		});
		expect(first.status).toBe('needs_clarification');
		if (first.status !== 'needs_clarification') return;
		expect(first.message).toBe('Which Slack channel should receive the message?');
		const second = await service.create({ sessionId: first.sessionId, request: '#sales please' });
		expect(second.status).toBe('compiled');
		if (second.status !== 'compiled') return;
		expect(second.sessionId).toBe(first.sessionId);
		const slack = second.workflow.nodes.find((node) => node.type === 'n8n-nodes-base.slack');
		expect(slack?.parameters).toMatchObject({ channelId: { value: '#sales' } });
	});

	it('abstains instead of guessing when the decision service is unavailable and retrieval is not decisive', async () => {
		const service = new WorkflowCompilerService();
		const result = await service.create({
			request: 'POST /orders then update the contact in HubSpot with the order',
		});
		expect(result.status).toBe('needs_clarification');
		if (result.status !== 'needs_clarification') return;
		expect(result.unresolved[0].field).toMatch(/^actions\..*\.operation$/);
		expect(result.unresolved[0].candidates).toContain('hubspot.contact.update');
	});

	it('honours none_of_these from the decision service', async () => {
		const decisions = scriptedDecisions({ '*': 'none_of_these' }, 0.9);
		const service = new WorkflowCompilerService({ decisions });
		const result = await service.create({
			request: 'POST /orders then update the contact in HubSpot with the order',
		});
		expect(result.status).toBe('needs_clarification');
		if (result.status !== 'needs_clarification') return;
		expect(result.message).toContain('None of the supported operations fit');
	});
});

describe('WorkflowCompilerService.edit', () => {
	it('adds a step after a named node and preserves the rest of the workflow', async () => {
		const service = new WorkflowCompilerService({ decisions: scriptedDecisions() });
		const created = await service.create({ request: REQUEST });
		if (created.status !== 'compiled') throw new Error('setup failed');
		const before = JSON.stringify(created.workflow);
		const edited = await service.edit({
			request: 'After Insert Row, add a Slack message to #audit',
			workflow: created.workflow,
			workflowId: 'wf-1',
		});
		expect(edited.status).toBe('compiled');
		if (edited.status !== 'compiled') return;
		expect(JSON.stringify(created.workflow)).toBe(before);
		const added = edited.workflow.nodes.find((node) => node.name === 'Send Slack Message 2');
		expect(added?.parameters).toMatchObject({ channelId: { value: '#audit' } });
		expect(edited.workflow.connections['Insert Row'].main[0]).toEqual([
			{ node: 'Send Slack Message 2', type: 'main', index: 0 },
		]);
		expect(edited.workflow.connections['Send Slack Message 2'].main[0]).toEqual([
			{ node: 'Respond', type: 'main', index: 0 },
		]);
		expect(edited.changedNodeNames).toContain('Send Slack Message 2');
		expect(edited.report.structural).toBe('pass');
	});

	it('updates a parameter on the named node', async () => {
		const service = new WorkflowCompilerService({ decisions: scriptedDecisions() });
		const created = await service.create({ request: REQUEST });
		if (created.status !== 'compiled') throw new Error('setup failed');
		const edited = await service.edit({
			request: 'Change the Send Slack Message channel to #ops',
			workflow: created.workflow,
			workflowId: 'wf-1',
		});
		expect(edited.status).toBe('compiled');
		if (edited.status !== 'compiled') return;
		const slack = edited.workflow.nodes.find((node) => node.name === 'Send Slack Message');
		expect(slack?.parameters).toMatchObject({
			channelId: { __rl: true, mode: 'name', value: '#ops' },
			resource: 'message',
		});
	});

	it('removes a node and reconnects its neighbours', async () => {
		const service = new WorkflowCompilerService({ decisions: scriptedDecisions() });
		const created = await service.create({ request: REQUEST });
		if (created.status !== 'compiled') throw new Error('setup failed');
		const edited = await service.edit({
			request: 'Remove the Insert Row step',
			workflow: created.workflow,
			workflowId: 'wf-1',
		});
		expect(edited.status).toBe('compiled');
		if (edited.status !== 'compiled') return;
		expect(edited.workflow.nodes.some((node) => node.name === 'Insert Row')).toBe(false);
		expect(edited.workflow.connections['They are new?'].main[1]).toEqual([
			{ node: 'Respond', type: 'main', index: 0 },
		]);
		expect(edited.workflow.connections['Send Slack Message'].main[0]).toEqual([
			{ node: 'Respond', type: 'main', index: 0 },
		]);
	});
});

describe('WorkflowCompilerService.debug', () => {
	it('enables retries for a transient failure using execution evidence', async () => {
		const service = new WorkflowCompilerService({ decisions: scriptedDecisions() });
		const created = await service.create({ request: REQUEST });
		if (created.status !== 'compiled') throw new Error('setup failed');
		const debugged = await service.debug({
			workflow: created.workflow,
			workflowId: 'wf-1',
			execution: {
				executionId: 'exec-1',
				status: 'error',
				failedNode: {
					name: 'Upsert Contact',
					type: 'n8n-nodes-base.hubspot',
					error: 'connect ECONNRESET api.hubapi.com',
				},
				nodeTrace: [],
			},
		});
		expect(debugged.status).toBe('compiled');
		if (debugged.status !== 'compiled') return;
		expect(debugged.workflow.nodes.find((node) => node.name === 'Upsert Contact')).toMatchObject({
			retryOnFail: true,
			maxTries: 3,
		});
		expect(debugged.summary).toContain('Diagnosis: transient');
	});

	it('routes credential failures to setup instead of patching', async () => {
		const service = new WorkflowCompilerService({ decisions: scriptedDecisions() });
		const asked = await service.create({
			request: 'Every night, run SQL query cleanup in Postgres',
		});
		expect(asked.status).toBe('needs_clarification');
		if (asked.status !== 'needs_clarification') return;
		expect(asked.message).toBe('Which SQL statement should run?');
		const created = await service.create({
			sessionId: asked.sessionId,
			request: 'DELETE FROM sessions WHERE expires_at < now()',
		});
		if (created.status !== 'compiled') throw new Error(`setup failed: ${JSON.stringify(created)}`);
		expect(
			created.workflow.nodes.find((node) => node.name === 'Run SQL Query')?.parameters?.query,
		).toBe('DELETE FROM sessions WHERE expires_at < now()');
		const debugged = await service.debug({
			workflow: created.workflow,
			workflowId: 'wf-1',
			execution: {
				executionId: 'exec-2',
				status: 'error',
				failedNode: {
					name: 'Run SQL Query',
					type: 'n8n-nodes-base.postgres',
					error: 'Authentication failed: 401 Unauthorized',
				},
				nodeTrace: [],
			},
		});
		expect(debugged.status).toBe('needs_setup');
	});

	it('repairs a misspelled node reference', async () => {
		const service = new WorkflowCompilerService({ decisions: scriptedDecisions() });
		const created = await service.create({ request: REQUEST });
		if (created.status !== 'compiled') throw new Error('setup failed');
		const respond = created.workflow.nodes.find((node) => node.name === 'Respond');
		if (respond?.parameters)
			respond.parameters.responseBody =
				'={{ ({ "contactId": $("Upsert Contac").item.json.vid }) }}';
		const debugged = await service.debug({
			workflow: created.workflow,
			workflowId: 'wf-1',
			execution: {
				executionId: 'exec-3',
				status: 'error',
				failedNode: {
					name: 'Respond',
					type: 'n8n-nodes-base.respondToWebhook',
					error: "Referenced node doesn't exist: Upsert Contac",
				},
				nodeTrace: [],
			},
		});
		expect(debugged.status).toBe('compiled');
		if (debugged.status !== 'compiled') return;
		expect(
			debugged.workflow.nodes.find((node) => node.name === 'Respond')?.parameters?.responseBody,
		).toContain('$("Upsert Contact")');
	});
});
