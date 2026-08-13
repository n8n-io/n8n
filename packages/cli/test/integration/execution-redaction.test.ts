import {
	createTeamProject,
	linkUserToProject,
	createWorkflow,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { stringify } from 'flatted';
import type {
	IBinaryKeyData,
	IDataObject,
	INode,
	IRunExecutionData,
	IWorkflowBase,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { createRunExecutionData, NodeApiError, NodeOperationError } from 'n8n-workflow';

import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { WaitTracker } from '@/wait-tracker';

import { createExecution } from './shared/db/executions';
import {
	createMember,
	createMemberWithApiKey,
	createOwner,
	createOwnerWithApiKey,
} from './shared/db/users';
import { setupTestServer } from './shared/utils';

mockInstance(WaitTracker);
mockInstance(ConcurrencyControlService, {
	// @ts-expect-error Private property
	isEnabled: false,
});

const testServer = setupTestServer({
	endpointGroups: ['executions', 'workflows', 'publicApi'],
	modules: ['redaction'],
});

let owner: User;
let member: User;
let publicApiOwner: User;
let publicApiMember: User;

beforeEach(async () => {
	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'SharedWorkflow']);
	testServer.license.reset();
	testServer.license.enable('feat:dataRedaction');
	owner = await createOwner();
	member = await createMember();
	publicApiOwner = await createOwnerWithApiKey();
	publicApiMember = await createMemberWithApiKey();
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

const STACK_NODE: INode = {
	id: 'node-1',
	name: 'Test Node',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

type SensitiveItem = { json: IDataObject; binary?: IBinaryKeyData };

function buildRunExecutionData(opts: {
	policy?: 'none' | 'non-manual' | 'all';
	channels?: { production: boolean; manual: boolean };
	mode?: WorkflowExecuteMode;
	/** Item to plant in runData (and, with `withStack`, the executionData subtrees). */
	item?: SensitiveItem;
	/** Also plant the item in executionData.nodeExecutionStack and waitingExecution. */
	withStack?: boolean;
}): IRunExecutionData {
	const redaction = opts.channels
		? {
				version: 2 as const,
				production: opts.channels.production,
				manual: opts.channels.manual,
			}
		: opts.policy
			? { version: 1 as const, policy: opts.policy }
			: undefined;

	const item: SensitiveItem = opts.item ?? {
		json: { ...SENSITIVE_JSON },
		binary: { file: { ...BINARY_DATA } },
	};

	const runtimeData = redaction
		? {
				version: 1 as const,
				establishedAt: Date.now(),
				source: opts.mode ?? 'trigger',
				redaction,
			}
		: undefined;

	const stackSubtrees = opts.withStack
		? {
				nodeExecutionStack: [{ node: STACK_NODE, source: null, data: { main: [[{ ...item }]] } }],
				waitingExecution: { 'Test Node': { 0: { main: [[{ ...item }]] } } },
			}
		: undefined;

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
						data: { main: [[{ ...item }]] },
					},
				],
			},
		},
		executionData:
			runtimeData || stackSubtrees
				? { ...(runtimeData && { runtimeData }), ...stackSubtrees }
				: undefined,
	});
}

async function createExecutionWithRedaction(opts: {
	workflow: IWorkflowBase;
	mode?: WorkflowExecuteMode;
	policy?: 'none' | 'non-manual' | 'all';
	channels?: { production: boolean; manual: boolean };
	item?: SensitiveItem;
	withStack?: boolean;
}) {
	const runData = buildRunExecutionData({
		policy: opts.policy,
		channels: opts.channels,
		mode: opts.mode,
		item: opts.item,
		withStack: opts.withStack,
	});
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

function assertRedacted(
	data: IRunExecutionData,
	expectedReason = 'workflow_redaction_policy',
	expectedCanReveal = true,
) {
	const items = data.resultData.runData['Test Node'][0].data!.main[0]!;
	expect(items.length).toBeGreaterThan(0);
	for (const item of items) {
		expect(item.json).toEqual({});
		expect(item.binary).toBeUndefined();
		expect(item.redaction).toEqual({ redacted: true, reason: expectedReason });
	}
	expect(data.redactionInfo).toEqual({
		isRedacted: true,
		reason: expectedReason,
		canReveal: expectedCanReveal,
	});
}

function assertNotRedacted(data: IRunExecutionData) {
	const items = data.resultData.runData['Test Node'][0].data!.main[0]!;
	expect(items.length).toBeGreaterThan(0);
	for (const item of items) {
		expect(item.json).toEqual(expect.objectContaining({ secret: 'sensitive-value' }));
	}
	expect(data.redactionInfo).toBeUndefined();
}

// Asserts the executionData subtrees (nodeExecutionStack, waitingExecution) had
// their item data cleared. Requires the execution to have been built with
// `withStack: true`.
function assertStackRedacted(data: IRunExecutionData) {
	const stackItem = data.executionData!.nodeExecutionStack[0].data.main[0]![0];
	expect(stackItem.json).toEqual({});
	expect(stackItem.binary).toBeUndefined();
	expect(stackItem.redaction).toMatchObject({ redacted: true });

	const waitItem = data.executionData!.waitingExecution['Test Node'][0].main[0]![0];
	expect(waitItem.json).toEqual({});
	expect(waitItem.binary).toBeUndefined();
	expect(waitItem.redaction).toMatchObject({ redacted: true });
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

	describe('per-channel (V2) redaction snapshot', () => {
		test('production channel on, trigger mode — returns redacted', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				channels: { production: true, manual: false },
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertRedacted(parseResponseData(response.body));
		});

		test('production channel on, manual mode — returns unredacted', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'manual',
				channels: { production: true, manual: false },
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertNotRedacted(parseResponseData(response.body));
		});

		test('both channels on, manual mode — returns redacted', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'manual',
				channels: { production: true, manual: true },
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertRedacted(parseResponseData(response.body));
		});

		test('both channels off, trigger mode — returns unredacted', async () => {
			const workflow = await createWorkflow({}, owner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				channels: { production: false, manual: false },
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			assertNotRedacted(parseResponseData(response.body));
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

		test('member can reveal data on a workflow in their own personal project', async () => {
			const workflow = await createWorkflow({}, member);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'all',
			});

			const response = await testServer
				.authAgentFor(member)
				.get(`/executions/${execution.id}`)
				.query({ redactExecutionData: 'false' })
				.expect(200);

			assertNotRedacted(parseResponseData(response.body));
		});

		test('project editor without execution:reveal scope gets 403 with structured error', async () => {
			testServer.license.enable('feat:sharing');

			const teamProject = await createTeamProject();
			await linkUserToProject(member, teamProject, 'project:editor');

			const workflow = await createWorkflow({}, teamProject);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'all',
			});

			const response = await testServer
				.authAgentFor(member)
				.get(`/executions/${execution.id}`)
				.query({ redactExecutionData: 'false' })
				.expect(403);

			expect(response.status).toBe(403);
			expect(response.body.message).toContain('execution:reveal');
		});

		test('project editor without execution:reveal scope can still reveal when policy allows it (policy=none)', async () => {
			testServer.license.enable('feat:sharing');

			const teamProject = await createTeamProject();
			await linkUserToProject(member, teamProject, 'project:editor');

			const workflow = await createWorkflow({}, teamProject);
			// policy='none' means policyAllowsReveal=true — no permission check needed
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'none',
			});

			const response = await testServer
				.authAgentFor(member)
				.get(`/executions/${execution.id}`)
				.query({ redactExecutionData: 'false' })
				.expect(200);

			assertNotRedacted(parseResponseData(response.body));
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

	describe('error redaction through DB round-trip', () => {
		const mockNode: INode = {
			id: 'node-1',
			name: 'Test Node',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		test('task-level NodeApiError is redacted after DB round-trip', async () => {
			const workflow = await createWorkflow({}, owner);
			const error = new NodeApiError(mockNode, { message: 'Bad Gateway' }, { httpCode: '502' });
			const runData = buildRunExecutionData({ policy: 'all', mode: 'trigger' });
			runData.resultData.runData['Test Node'][0].error = error;

			const execution = await createExecution(
				{ data: stringify(runData), mode: 'trigger' },
				workflow,
			);

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			const data = parseResponseData(response.body);
			const taskData = data.resultData.runData['Test Node'][0];
			expect(taskData.error).toBeUndefined();
			expect(taskData.redactedError).toEqual({ type: 'NodeApiError', httpCode: null });
		});

		test('workflow-level NodeOperationError is redacted after DB round-trip', async () => {
			const workflow = await createWorkflow({}, owner);
			const error = new NodeOperationError(mockNode, 'Workflow operation failed');
			const runData = buildRunExecutionData({ policy: 'all', mode: 'trigger' });
			runData.resultData.error = error;

			const execution = await createExecution(
				{ data: stringify(runData), mode: 'trigger' },
				workflow,
			);

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${execution.id}`)
				.expect(200);

			const data = parseResponseData(response.body);
			expect(data.resultData.error).toBeUndefined();
			expect(data.resultData.redactedError).toEqual({ type: 'NodeOperationError' });
			expect(data.resultData.redactedError).not.toHaveProperty('httpCode');
		});
	});
});

// ---------------------------------------------------------------------------
// GET /workflows/:workflowId/executions/last-successful — Execution Redaction
// ---------------------------------------------------------------------------

describe('GET /workflows/:workflowId/executions/last-successful — Execution Redaction', () => {
	describe('policy-based redaction (no query param)', () => {
		test('policy "none" with trigger mode — returns unredacted', async () => {
			const workflow = await createWorkflow({}, owner);
			await createExecutionWithRedaction({ workflow, mode: 'trigger', policy: 'none' });

			const response = await testServer
				.authAgentFor(owner)
				.get(`/workflows/${workflow.id}/executions/last-successful`)
				.expect(200);

			assertNotRedacted(response.body.data.data as IRunExecutionData);
		});

		test('policy "non-manual" with trigger mode — returns redacted', async () => {
			const workflow = await createWorkflow({}, owner);
			await createExecutionWithRedaction({ workflow, mode: 'trigger', policy: 'non-manual' });

			const response = await testServer
				.authAgentFor(owner)
				.get(`/workflows/${workflow.id}/executions/last-successful`)
				.expect(200);

			assertRedacted(response.body.data.data as IRunExecutionData);
		});

		test('policy "non-manual" with manual mode — returns unredacted', async () => {
			const workflow = await createWorkflow({}, owner);
			await createExecutionWithRedaction({ workflow, mode: 'manual', policy: 'non-manual' });

			const response = await testServer
				.authAgentFor(owner)
				.get(`/workflows/${workflow.id}/executions/last-successful`)
				.expect(200);

			assertNotRedacted(response.body.data.data as IRunExecutionData);
		});

		test('policy "all" with trigger mode — returns redacted', async () => {
			const workflow = await createWorkflow({}, owner);
			await createExecutionWithRedaction({ workflow, mode: 'trigger', policy: 'all' });

			const response = await testServer
				.authAgentFor(owner)
				.get(`/workflows/${workflow.id}/executions/last-successful`)
				.expect(200);

			assertRedacted(response.body.data.data as IRunExecutionData);
		});
	});

	describe('explicit redactExecutionData=true query param', () => {
		test('always redacts even when policy is "none"', async () => {
			const workflow = await createWorkflow({}, owner);
			await createExecutionWithRedaction({ workflow, mode: 'trigger', policy: 'none' });

			const response = await testServer
				.authAgentFor(owner)
				.get(`/workflows/${workflow.id}/executions/last-successful`)
				.query({ redactExecutionData: 'true' })
				.expect(200);

			assertRedacted(response.body.data.data as IRunExecutionData, 'user_requested');
		});
	});

	describe('explicit redactExecutionData=false query param (reveal)', () => {
		test('owner can reveal unredacted data when policy is "all"', async () => {
			const workflow = await createWorkflow({}, owner);
			await createExecutionWithRedaction({ workflow, mode: 'trigger', policy: 'all' });

			const response = await testServer
				.authAgentFor(owner)
				.get(`/workflows/${workflow.id}/executions/last-successful`)
				.query({ redactExecutionData: 'false' })
				.expect(200);

			assertNotRedacted(response.body.data.data as IRunExecutionData);
		});
	});

	test('returns null when no successful execution exists', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await testServer
			.authAgentFor(owner)
			.get(`/workflows/${workflow.id}/executions/last-successful`)
			.expect(200);

		expect(response.body.data).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// GET /api/v1/executions/:id — Execution Redaction
// ---------------------------------------------------------------------------

describe('GET /api/v1/executions/:id — Execution Redaction', () => {
	describe('policy-based redaction (includeData=true)', () => {
		test('policy "none" with trigger mode — returns unredacted', async () => {
			const workflow = await createWorkflow({}, publicApiMember);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'none',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiMember)
				.get(`/executions/${execution.id}?includeData=true`)
				.expect(200);

			assertNotRedacted(response.body.data as IRunExecutionData);
		});

		test('policy "non-manual" with trigger mode — redacts for member on own personal project workflow (canReveal=true)', async () => {
			const workflow = await createWorkflow({}, publicApiMember);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'non-manual',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiMember)
				.get(`/executions/${execution.id}?includeData=true`)
				.expect(200);

			assertRedacted(response.body.data as IRunExecutionData, 'workflow_redaction_policy', true);
		});

		test('policy "non-manual" with trigger mode — redacts for owner (canReveal=true)', async () => {
			const workflow = await createWorkflow({}, publicApiOwner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'non-manual',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiOwner)
				.get(`/executions/${execution.id}?includeData=true`)
				.expect(200);

			assertRedacted(response.body.data as IRunExecutionData, 'workflow_redaction_policy', true);
		});

		test('policy "non-manual" with manual mode — returns unredacted', async () => {
			const workflow = await createWorkflow({}, publicApiMember);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'manual',
				policy: 'non-manual',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiMember)
				.get(`/executions/${execution.id}?includeData=true`)
				.expect(200);

			assertNotRedacted(response.body.data as IRunExecutionData);
		});

		test('policy "all" with trigger mode — redacts for member on own personal project workflow (canReveal=true)', async () => {
			const workflow = await createWorkflow({}, publicApiMember);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'all',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiMember)
				.get(`/executions/${execution.id}?includeData=true`)
				.expect(200);

			assertRedacted(response.body.data as IRunExecutionData, 'workflow_redaction_policy', true);
		});

		test('includeData=false — returns execution without data field', async () => {
			const workflow = await createWorkflow({}, publicApiMember);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'all',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiMember)
				.get(`/executions/${execution.id}`)
				.expect(200);

			expect(response.body.data).toBeUndefined();
		});
	});

	describe('explicit redactExecutionData=true query param', () => {
		test('always redacts even when policy is "none"', async () => {
			const workflow = await createWorkflow({}, publicApiOwner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'none',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiOwner)
				.get(`/executions/${execution.id}?includeData=true&redactExecutionData=true`)
				.expect(200);

			assertRedacted(response.body.data as IRunExecutionData, 'user_requested');
		});
	});

	describe('explicit redactExecutionData=false query param (reveal)', () => {
		test('owner can reveal unredacted data', async () => {
			const workflow = await createWorkflow({}, publicApiOwner);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'all',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiOwner)
				.get(`/executions/${execution.id}?includeData=true&redactExecutionData=false`)
				.expect(200);

			assertNotRedacted(response.body.data as IRunExecutionData);
		});

		test('member without execution:reveal scope gets 403', async () => {
			testServer.license.enable('feat:sharing');

			const teamProject = await createTeamProject();
			await linkUserToProject(publicApiMember, teamProject, 'project:editor');

			const workflow = await createWorkflow({}, teamProject);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'all',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiMember)
				.get(`/executions/${execution.id}?includeData=true&redactExecutionData=false`)
				.expect(403);

			expect(response.status).toBe(403);
			expect(response.body.message).toContain('execution:reveal');
		});

		test('member without execution:reveal scope can still reveal when policy allows it (policy=none)', async () => {
			testServer.license.enable('feat:sharing');

			const teamProject = await createTeamProject();
			await linkUserToProject(publicApiMember, teamProject, 'project:editor');

			const workflow = await createWorkflow({}, teamProject);
			const execution = await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'none',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiMember)
				.get(`/executions/${execution.id}?includeData=true&redactExecutionData=false`)
				.expect(200);

			assertNotRedacted(response.body.data as IRunExecutionData);
		});
	});
});

// ---------------------------------------------------------------------------
// GET /api/v1/executions — Execution Redaction
// ---------------------------------------------------------------------------

describe('GET /api/v1/executions — Execution Redaction', () => {
	test('policy "non-manual" with trigger mode — redacts all executions in list', async () => {
		const workflow = await createWorkflow({}, publicApiMember);
		await createExecutionWithRedaction({
			workflow,
			mode: 'trigger',
			policy: 'non-manual',
		});

		const response = await testServer
			.publicApiAgentFor(publicApiMember)
			.get('/executions?includeData=true')
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		assertRedacted(
			response.body.data[0].data as IRunExecutionData,
			'workflow_redaction_policy',
			true,
		);
	});

	test('policy "none" — list returns unredacted when includeData=true', async () => {
		const workflow = await createWorkflow({}, publicApiMember);
		await createExecutionWithRedaction({
			workflow,
			mode: 'trigger',
			policy: 'none',
		});

		const response = await testServer
			.publicApiAgentFor(publicApiMember)
			.get('/executions?includeData=true')
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		assertNotRedacted(response.body.data[0].data as IRunExecutionData);
	});

	test('includeData=false — returns executions without data field', async () => {
		const workflow = await createWorkflow({}, publicApiMember);
		await createExecutionWithRedaction({
			workflow,
			mode: 'trigger',
			policy: 'all',
		});

		const response = await testServer
			.publicApiAgentFor(publicApiMember)
			.get('/executions')
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].data).toBeUndefined();
	});

	test('batch: multiple executions across multiple workflows — each redacted independently', async () => {
		const workflow1 = await createWorkflow({}, publicApiMember);
		const workflow2 = await createWorkflow({}, publicApiMember);

		// workflow1: policy "non-manual", trigger → should be redacted
		await createExecutionWithRedaction({
			workflow: workflow1,
			mode: 'trigger',
			policy: 'non-manual',
		});
		// workflow1: policy "non-manual", manual → should NOT be redacted
		await createExecutionWithRedaction({
			workflow: workflow1,
			mode: 'manual',
			policy: 'non-manual',
		});
		// workflow2: policy "none", trigger → should NOT be redacted
		await createExecutionWithRedaction({ workflow: workflow2, mode: 'trigger', policy: 'none' });
		// workflow2: policy "all", webhook → should be redacted
		await createExecutionWithRedaction({ workflow: workflow2, mode: 'webhook', policy: 'all' });

		const response = await testServer
			.publicApiAgentFor(publicApiMember)
			.get('/executions?includeData=true')
			.expect(200);

		expect(response.body.data).toHaveLength(4);

		const results = response.body.data as Array<{
			workflowId: string;
			mode: string;
			data: IRunExecutionData;
		}>;

		const wf1Trigger = results.find((e) => e.workflowId === workflow1.id && e.mode === 'trigger');
		const wf1Manual = results.find((e) => e.workflowId === workflow1.id && e.mode === 'manual');
		const wf2Trigger = results.find((e) => e.workflowId === workflow2.id && e.mode === 'trigger');
		const wf2Webhook = results.find((e) => e.workflowId === workflow2.id && e.mode === 'webhook');

		assertRedacted(wf1Trigger!.data, 'workflow_redaction_policy', true);
		assertNotRedacted(wf1Manual!.data);
		assertNotRedacted(wf2Trigger!.data);
		assertRedacted(wf2Webhook!.data, 'workflow_redaction_policy', true);
	});

	describe('explicit redactExecutionData=true query param', () => {
		test('always redacts even when policy is "none"', async () => {
			const workflow = await createWorkflow({}, publicApiOwner);
			await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'none',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiOwner)
				.get('/executions?includeData=true&redactExecutionData=true')
				.expect(200);

			expect(response.body.data).toHaveLength(1);
			assertRedacted(response.body.data[0].data as IRunExecutionData, 'user_requested');
		});
	});

	describe('explicit redactExecutionData=false query param (reveal)', () => {
		test('owner can reveal unredacted data in list', async () => {
			const workflow = await createWorkflow({}, publicApiOwner);
			await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'all',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiOwner)
				.get('/executions?includeData=true&redactExecutionData=false')
				.expect(200);

			expect(response.body.data).toHaveLength(1);
			assertNotRedacted(response.body.data[0].data as IRunExecutionData);
		});

		test('member without execution:reveal scope gets 403 in list', async () => {
			testServer.license.enable('feat:sharing');

			const teamProject = await createTeamProject();
			await linkUserToProject(publicApiMember, teamProject, 'project:editor');

			const workflow = await createWorkflow({}, teamProject);
			await createExecutionWithRedaction({
				workflow,
				mode: 'trigger',
				policy: 'all',
			});

			const response = await testServer
				.publicApiAgentFor(publicApiMember)
				.get('/executions?includeData=true&redactExecutionData=false')
				.expect(403);

			expect(response.status).toBe(403);
			expect(response.body.message).toContain('execution:reveal');
		});
	});
});

// ---------------------------------------------------------------------------
// executionData subtrees (nodeExecutionStack / waitingExecution) redaction
// ---------------------------------------------------------------------------

describe('executionData subtrees — redaction through DB round-trip', () => {
	test('REST GET /executions/:id — stack and waiting items are redacted', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createExecutionWithRedaction({
			workflow,
			mode: 'trigger',
			policy: 'all',
			withStack: true,
		});

		const response = await testServer
			.authAgentFor(owner)
			.get(`/executions/${execution.id}`)
			.expect(200);

		const data = parseResponseData(response.body);
		assertRedacted(data);
		assertStackRedacted(data);
	});

	test('Public API GET /api/v1/executions/:id — stack and waiting items are redacted', async () => {
		const workflow = await createWorkflow({}, publicApiMember);
		const execution = await createExecutionWithRedaction({
			workflow,
			mode: 'trigger',
			policy: 'all',
			withStack: true,
		});

		const response = await testServer
			.publicApiAgentFor(publicApiMember)
			.get(`/executions/${execution.id}?includeData=true`)
			.expect(200);

		const data = response.body.data as IRunExecutionData;
		assertRedacted(data, 'workflow_redaction_policy', true);
		assertStackRedacted(data);
	});
});

// ---------------------------------------------------------------------------
// Canary: a sensitive item value planted in every item-bearing subtree must
// not appear anywhere in a redacted response, on any surface that serves data.
// ---------------------------------------------------------------------------

describe('sensitive item values are not exposed across surfaces', () => {
	const SENTINEL_JSON = 'IAM950-SENTINEL-JSON-8f3a2b';
	const SENTINEL_BINARY = 'IAM950-SENTINEL-BINARY-8f3a2b';

	const item: SensitiveItem = {
		json: { deep: SENTINEL_JSON },
		binary: { file: { mimeType: 'text/plain', fileName: 'x.txt', data: SENTINEL_BINARY } },
	};

	// Search the whole serialized response — surface-agnostic, so it catches the
	// value regardless of which subtree (runData, stack, waiting) or encoding
	// (flatted string vs. nested object) it hides in.
	const exposesSentinel = (body: unknown): boolean => {
		const serialized = JSON.stringify(body);
		return serialized.includes(SENTINEL_JSON) || serialized.includes(SENTINEL_BINARY);
	};

	test('REST GET /executions/:id', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createExecutionWithRedaction({
			workflow,
			mode: 'trigger',
			policy: 'all',
			item,
			withStack: true,
		});

		const response = await testServer
			.authAgentFor(owner)
			.get(`/executions/${execution.id}`)
			.expect(200);

		expect(exposesSentinel(response.body)).toBe(false);
	});

	test('REST GET /workflows/:workflowId/executions/last-successful', async () => {
		const workflow = await createWorkflow({}, owner);
		await createExecutionWithRedaction({
			workflow,
			mode: 'trigger',
			policy: 'all',
			item,
			withStack: true,
		});

		const response = await testServer
			.authAgentFor(owner)
			.get(`/workflows/${workflow.id}/executions/last-successful`)
			.expect(200);

		expect(exposesSentinel(response.body)).toBe(false);
	});

	test('Public API GET /api/v1/executions/:id', async () => {
		const workflow = await createWorkflow({}, publicApiOwner);
		const execution = await createExecutionWithRedaction({
			workflow,
			mode: 'trigger',
			policy: 'all',
			item,
			withStack: true,
		});

		const response = await testServer
			.publicApiAgentFor(publicApiOwner)
			.get(`/executions/${execution.id}?includeData=true`)
			.expect(200);

		expect(exposesSentinel(response.body)).toBe(false);
	});

	test('Public API GET /api/v1/executions', async () => {
		const workflow = await createWorkflow({}, publicApiOwner);
		await createExecutionWithRedaction({
			workflow,
			mode: 'trigger',
			policy: 'all',
			item,
			withStack: true,
		});

		const response = await testServer
			.publicApiAgentFor(publicApiOwner)
			.get('/executions?includeData=true')
			.expect(200);

		expect(exposesSentinel(response.body)).toBe(false);
	});

	// Guards against a vacuously-green canary: on the reveal path the value must
	// still be observable, proving the search would catch a real exposure.
	test('control: revealed (unredacted) response does expose the sentinel', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createExecutionWithRedaction({
			workflow,
			mode: 'trigger',
			policy: 'all',
			item,
			withStack: true,
		});

		const response = await testServer
			.authAgentFor(owner)
			.get(`/executions/${execution.id}`)
			.query({ redactExecutionData: 'false' })
			.expect(200);

		expect(exposesSentinel(response.body)).toBe(true);
	});
});
