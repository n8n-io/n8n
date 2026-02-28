import {
	createTeamProject,
	linkUserToProject,
	createWorkflow,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { stringify } from 'flatted';
import type { IRunExecutionData, IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { WaitTracker } from '@/wait-tracker';

import { createExecution } from './shared/db/executions';
import { createMember, createOwner } from './shared/db/users';
import { setupTestServer } from './shared/utils';

// Must be set before setupTestServer() so RedactionModule.init() wires the real service
process.env.N8N_ENV_FEAT_EXECUTION_REDACTION = 'true';

mockInstance(WaitTracker);
mockInstance(ConcurrencyControlService, {
	// @ts-expect-error Private property
	isEnabled: false,
});

const testServer = setupTestServer({
	endpointGroups: ['executions'],
	modules: ['redaction'],
});

let owner: User;
let member: User;

beforeEach(async () => {
	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'SharedWorkflow']);
	testServer.license.reset();
	owner = await createOwner();
	member = await createMember();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SENSITIVE_JSON = { secret: 'sensitive-value', apiKey: 'sk-1234' };

const BINARY_DATA = {
	data: 'base64data',
	mimeType: 'text/plain',
	fileName: 'secret.txt',
};

function buildRunExecutionData(opts: {
	policy?: 'none' | 'non-manual' | 'all';
	mode?: WorkflowExecuteMode;
}): IRunExecutionData {
	return createRunExecutionData({
		resultData: {
			runData: {
				'Test Node': [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: {
							main: [
								[
									{
										json: { ...SENSITIVE_JSON },
										binary: { file: { ...BINARY_DATA } },
									},
								],
							],
						},
					},
				],
			},
		},
		executionData: opts.policy
			? {
					runtimeData: {
						version: 1 as const,
						establishedAt: Date.now(),
						source: opts.mode ?? 'trigger',
						redaction: { version: 1 as const, policy: opts.policy },
					},
				}
			: undefined,
	});
}

async function createExecutionWithRedaction(opts: {
	workflow: IWorkflowBase;
	mode?: WorkflowExecuteMode;
	policy?: 'none' | 'non-manual' | 'all';
}) {
	const runData = buildRunExecutionData({ policy: opts.policy, mode: opts.mode });
	return await createExecution(
		{ data: stringify(runData), mode: opts.mode ?? 'trigger' },
		opts.workflow,
	);
}

function parseResponseData(responseBody: { data: { data: string } }): IRunExecutionData {
	// The response data field is flatted-stringified
	const { parse } = require('flatted');
	return parse(responseBody.data.data) as IRunExecutionData;
}

function assertRedacted(data: IRunExecutionData, expectedReason = 'workflow_redaction_policy') {
	const items = data.resultData.runData['Test Node'][0].data!.main[0]!;
	expect(items.length).toBeGreaterThan(0);
	for (const item of items) {
		expect(item.json).toEqual({});
		expect(item.binary).toBeUndefined();
		expect(item.redaction).toEqual({ redacted: true, reason: expectedReason });
	}
}

function assertNotRedacted(data: IRunExecutionData) {
	const items = data.resultData.runData['Test Node'][0].data!.main[0]!;
	expect(items.length).toBeGreaterThan(0);
	for (const item of items) {
		expect(item.json).toEqual(expect.objectContaining({ secret: 'sensitive-value' }));
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /executions/:id — Execution Redaction', () => {
	describe('policy-based redaction (no query param)', () => {
		test('policy "none" with trigger mode — returns unredacted', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'none',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertNotRedacted(parseResponseData(response.body));
		});

		test('policy "none" with manual mode — returns unredacted', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'manual',
				policy: 'none',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertNotRedacted(parseResponseData(response.body));
		});

		test('policy "non-manual" with manual mode — returns unredacted', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'manual',
				policy: 'non-manual',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertNotRedacted(parseResponseData(response.body));
		});

		test('policy "non-manual" with trigger mode — returns redacted', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'non-manual',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertRedacted(parseResponseData(response.body));
		});

		test('policy "non-manual" with webhook mode — returns redacted', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'webhook',
				policy: 'non-manual',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertRedacted(parseResponseData(response.body));
		});

		test('policy "all" with manual mode — returns redacted', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'manual',
				policy: 'all',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertRedacted(parseResponseData(response.body));
		});

		test('policy "all" with trigger mode — returns redacted', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'all',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertRedacted(parseResponseData(response.body));
		});

		test('no runtimeData and no workflow settings — defaults to "none", returns unredacted', async () => {
			const workflow = await createWorkflow({}, owner);
			// No policy passed → no runtimeData.redaction
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertNotRedacted(parseResponseData(response.body));
		});

		test('no runtimeData but workflow settings has policy "all" — falls back to settings, returns redacted', async () => {
			const workflow = await createWorkflow({ settings: { redactionPolicy: 'all' } }, owner);
			// No runtimeData.redaction → falls back to workflowData.settings.redactionPolicy
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertRedacted(parseResponseData(response.body));
		});
	});

	describe('explicit redactExecutionData=true query param', () => {
		test('always redacts even when policy is "none"', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'none',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.query({ redactExecutionData: 'true' })
				.expect(200);

			assertRedacted(parseResponseData(response.body), 'user_requested');
		});
	});

	describe('explicit redactExecutionData=false query param (reveal)', () => {
		test('owner can reveal unredacted data', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'all',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.query({ redactExecutionData: 'false' })
				.expect(200);

			assertNotRedacted(parseResponseData(response.body));
		});

		test('project editor without execution:reveal scope gets 403', async () => {
			testServer.license.enable('feat:sharing');

			const teamProject = await createTeamProject();
			await linkUserToProject(member, teamProject, 'project:editor');

			const workflow = await createWorkflow({}, teamProject);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'all',
			});

			await testServer
				.authAgentFor(member)
				.get(`/executions/${execution.id}`)
				.query({ redactExecutionData: 'false' })
				.expect(403);
		});
	});

	describe('policy fallback precedence', () => {
		test('runtimeData policy takes precedence over workflowData.settings', async () => {
			// Workflow settings say "all" but runtimeData says "none"
			const workflow = await createWorkflow({ settings: { redactionPolicy: 'all' } }, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'none', // runtimeData wins
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertNotRedacted(parseResponseData(response.body));
		});

		test('falls back to workflowData.settings when runtimeData is missing', async () => {
			const workflow = await createWorkflow({ settings: { redactionPolicy: 'all' } }, owner);
			// No policy → no runtimeData.redaction → falls back to settings
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertRedacted(parseResponseData(response.body));
		});
	});
});
