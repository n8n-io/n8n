import { LicenseState } from '@n8n/backend-common';
import { ExecutionRedactionServiceProxy } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflowWithHistory,
	linkUserToProject,
	mockInstance,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import type { INode, INodeTypeData, INodeTypeDescription, IWorkflowBase } from 'n8n-workflow';
import { ExecutionContextHookRegistry } from 'n8n-core';
import { createRunExecutionData, NodeConnectionTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import { License } from '@/license';
import { ExecutionRedactionService } from '@/modules/redaction/executions/execution-redaction.service';
import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
// Declares the hook that the redaction module loads at startup.
import '@/modules/redaction/redaction-context-hook';
import { Push } from '@/push';
import { Telemetry } from '@/telemetry';
import { affixRoleToSaveCredential } from '@test-integration/db/credentials';
import { LicenseMocker } from '@test-integration/license';
import { createExecution } from '@test-integration/db/executions';
import { createMember, createOwner } from '@test-integration/db/users';
import { initNodeTypes } from '@test-integration/utils';
import { mockNodeTypesData } from '@test-integration/utils/node-types-data';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';

/**
 * With personal credentials in projects, a project member must not get execution
 * data from a node that uses another member's personal credential. The
 * Assistant reads executions outside the executions API, so it applies the
 * redaction itself.
 */
describe('Instance AI execution redaction (integration)', () => {
	mockInstance(ActiveWorkflowManager);
	mockInstance(Telemetry);
	mockInstance(Push, new Push(mock(), mock(), mock(), mock(), mock()));
	const redactionFloor = mockInstance(InstanceRedactionEnforcementService);

	const SECRET_OUTPUT = { email: 'alice@example.com', token: 'tok_secret' };
	const SECRET_ERROR = 'Upstream said: tok_secret is invalid';

	let adapterService: InstanceAiAdapterService;
	/** Can read every credential, but not use a member's personal one in a team project. */
	let owner: User;
	/** Owns the personal credential. */
	let alice: User;
	/** A member of the same team project. */
	let bob: User;
	let workflow: IWorkflowBase;
	let executionId: string;
	let teamProject: Project;
	let credential: { id: string; name: string };

	const saveCredential = affixRoleToSaveCredential('credential:owner');
	const licenseMocker = new LicenseMocker();

	const nodes = (credential: { id: string; name: string }): INode[] => [
		{
			id: 'trigger',
			name: 'Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: 'action',
			name: 'Action Network',
			type: 'n8n-nodes-base.actionNetwork',
			typeVersion: 1,
			position: [200, 0],
			parameters: { note: '={{ $json.token }}' },
			credentials: { actionNetworkApi: { id: credential.id, name: credential.name } },
		},
	];

	/** The credential check only counts credentials the node type declares. */
	const nodeTypesData = (): INodeTypeData => {
		const data = {
			...mockNodeTypesData(['scheduleTrigger'], { addTrigger: true }),
			...mockNodeTypesData(['actionNetwork']),
		};
		const description = data['n8n-nodes-base.actionNetwork'].type
			.description as INodeTypeDescription;
		description.credentials = [{ name: 'actionNetworkApi', required: true }];
		// A node that a one-off node run can execute, and that returns the secret.
		data['n8n-nodes-base.secretSource'] = {
			sourcePath: '',
			type: {
				description: {
					...description,
					displayName: 'Secret Source',
					name: 'secretSource',
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
					credentials: [{ name: 'actionNetworkApi', required: false }],
				},
				execute: async () => [[{ json: SECRET_OUTPUT }]],
			},
		};
		return data;
	};

	const executeNodeFor = (user: User, projectId?: string) =>
		adapterService.createContext(user, { threadId: 'thread-1', projectId }).executeNodeService!;

	const executionsFor = (user: User) =>
		adapterService.createContext(user, { threadId: 'thread-1' }).executionService;
	const workflowsFor = (user: User) =>
		adapterService.createContext(user, { threadId: 'thread-1' }).workflowService;

	beforeAll(async () => {
		await testDb.init();
		await initNodeTypes(nodeTypesData());
		// Registers the hook the side-effect import declared: it saves the redaction
		// policy onto each execution when the execution starts.
		await Container.get(ExecutionContextHookRegistry).init();
		licenseMocker.mock(Container.get(License));
		licenseMocker.mockLicenseState(Container.get(LicenseState));
		// What the redaction module wires up at startup.
		Container.get(ExecutionRedactionServiceProxy).setExecutionRedaction(
			Container.get(ExecutionRedactionService),
		);
		adapterService = Container.get(InstanceAiAdapterService);

		owner = await createOwner();
		[alice, bob] = await Promise.all([createMember(), createMember()]);
	});

	beforeEach(async () => {
		teamProject = await createTeamProject('Team', alice);
		await linkUserToProject(bob, teamProject, 'project:editor');
		credential = await saveCredential(randomCredentialPayload(), { user: alice });
		workflow = await createWorkflowWithHistory({ nodes: nodes(credential) }, teamProject);

		const data = createRunExecutionData({
			resultData: {
				lastNodeExecuted: 'Action Network',
				runData: {
					Trigger: [
						{
							startTime: 1,
							executionTime: 1,
							executionIndex: 0,
							source: [],
							data: { main: [[{ json: SECRET_OUTPUT }]] },
						},
					],
					'Action Network': [
						{
							startTime: 2,
							executionTime: 1,
							executionIndex: 1,
							source: [{ previousNode: 'Trigger' }],
							executionStatus: 'error',
							error: { name: 'NodeOperationError', message: SECRET_ERROR } as never,
						},
					],
				},
			},
		});
		const execution = await createExecution(
			{ data: stringify(data), status: 'error', mode: 'manual' },
			workflow,
		);
		executionId = execution.id;
	});

	afterEach(async () => {
		licenseMocker.reset();
		redactionFloor.get.mockReset();
		await testDb.truncate([
			'ExecutionEntity',
			'WorkflowEntity',
			'SharedWorkflow',
			'WorkflowHistory',
			'CredentialsEntity',
			'SharedCredentials',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('a member who cannot use the credential', () => {
		it('gets a redacted result', async () => {
			const result = await executionsFor(bob).getResult(executionId);

			expect(result.redaction).toEqual({ reason: 'credential_inaccessible', canReveal: false });
			expect(result.data).toBeUndefined();
			expect(JSON.stringify(result)).not.toContain('tok_secret');
			expect(result.nodeErrors).toEqual([
				{ nodeName: 'Action Network', message: 'NodeOperationError error (details hidden by n8n)' },
			]);
		});

		it('gets redacted node output', async () => {
			const output = await executionsFor(bob).getNodeOutput(executionId, 'Trigger');

			expect(output.redaction).toEqual({ reason: 'credential_inaccessible', canReveal: false });
			expect(JSON.stringify(output)).not.toContain('tok_secret');
		});

		it('gets redacted debug info', async () => {
			const debug = await executionsFor(bob).getDebugInfo(executionId);

			expect(debug.redaction).toEqual({ reason: 'credential_inaccessible', canReveal: false });
			expect(debug.failedNode).toMatchObject({
				name: 'Action Network',
				error: 'NodeOperationError error (details hidden by n8n)',
			});
			expect(debug.failedNode?.resolvedParameters).toBeUndefined();
			expect(JSON.stringify(debug)).not.toContain('tok_secret');
		});

		it('gets no resolved parameters', async () => {
			const resolved = await executionsFor(bob).getResolvedNodeParameters(
				executionId,
				'Action Network',
			);

			expect(resolved).toMatchObject({ suppressed: 'execution-redacted', resolved: null });
		});

		it('gets redacted latest run data for validation', async () => {
			const runData = await workflowsFor(bob).getLatestRunData!(workflow.id);

			expect(JSON.stringify(runData)).not.toContain('tok_secret');
			expect(runData?.['Action Network'][0].error).toBeUndefined();
		});

		it('cannot replay the execution in a step run', async () => {
			await expect(
				executionsFor(bob).runStep!(workflow.id, 'Action Network', {
					reuseExecutionId: executionId,
				}),
			).rejects.toThrow(/cannot be replayed/);
		});

		it('cannot publish the workflow', async () => {
			await expect(workflowsFor(bob).publish(workflow.id)).rejects.toThrow(
				/You do not have access to credential/,
			);
		});

		it('gets the reason when the Assistant runs the workflow', async () => {
			const result = await executionsFor(bob).run(workflow.id);

			expect(result.status).toBe('error');
			expect(result.error).toMatch(
				/^Node "Action Network" uses the credential ".+", which you cannot use\. Ask/,
			);
			expect(result.nodeErrors).toEqual([{ nodeName: 'Action Network', message: result.error }]);
		});

		it('is refused by the check every Assistant run goes through', async () => {
			// `WorkflowRunner.run` makes this check with the `userId` the adapter sets.
			await expect(
				Container.get(CredentialsPermissionChecker).check(workflow.id, workflow.nodes, bob.id),
			).rejects.toThrow(/which you cannot use/);
		});
	});

	describe('the member who owns the credential', () => {
		it('gets the full result', async () => {
			const result = await executionsFor(alice).getResult(executionId);

			expect(result.redaction).toBeUndefined();
			expect(JSON.stringify(result.data)).toContain('tok_secret');
		});

		it('gets the full node output', async () => {
			const output = await executionsFor(alice).getNodeOutput(executionId, 'Trigger');

			expect(output.redaction).toBeUndefined();
			expect(JSON.stringify(output)).toContain('tok_secret');
		});
	});

	describe('a workflow whose redaction policy covers the run', () => {
		/** A failed trigger run of the workflow, saved with the redaction policy `all`. */
		const createPolicyExecution = async () => {
			licenseMocker.enable('feat:dataRedaction');
			const data = createRunExecutionData({
				resultData: {
					lastNodeExecuted: 'Action Network',
					runData: {
						Trigger: [
							{
								startTime: 1,
								executionTime: 1,
								executionIndex: 0,
								source: [],
								data: { main: [[{ json: SECRET_OUTPUT }]] },
							},
						],
						'Action Network': [
							{
								startTime: 2,
								executionTime: 1,
								executionIndex: 1,
								source: [{ previousNode: 'Trigger' }],
								executionStatus: 'error',
								error: { name: 'NodeOperationError', message: SECRET_ERROR } as never,
							},
						],
					},
				},
			});
			const execution = await createExecution(
				{ data: stringify(data), status: 'error', mode: 'trigger' },
				{ ...workflow, settings: { redactionPolicy: 'all' } },
			);
			return execution.id;
		};

		it('gets redacted data, also for a project admin who may reveal it', async () => {
			const policyExecutionId = await createPolicyExecution();

			const result = await executionsFor(alice).getResult(policyExecutionId);
			const debug = await executionsFor(alice).getDebugInfo(policyExecutionId);
			const output = await executionsFor(alice).getNodeOutput(policyExecutionId, 'Trigger');

			for (const response of [result, debug, output]) {
				expect(response.redaction).toEqual({
					reason: 'workflow_redaction_policy',
					canReveal: true,
				});
				expect(JSON.stringify(response)).not.toContain('tok_secret');
			}
			expect(debug.failedNode?.error).toBe('NodeOperationError error (details hidden by n8n)');
		});

		it('returns the full data without the license', async () => {
			const policyExecutionId = await createPolicyExecution();
			licenseMocker.reset();

			const result = await executionsFor(alice).getResult(policyExecutionId);

			expect(result.redaction).toBeUndefined();
			expect(JSON.stringify(result.data)).toContain('tok_secret');
		});
	});
	describe('a one-off node run', () => {
		const secretNode = { type: 'n8n-nodes-base.secretSource', version: 1 };

		it('returns redacted output when the instance redaction minimum covers manual runs', async () => {
			licenseMocker.enable('feat:dataRedaction');
			redactionFloor.get.mockResolvedValue('all');

			const result = await executeNodeFor(alice).execute({
				...secretNode,
				config: { parameters: {} },
			});

			expect(result).toMatchObject({
				status: 'success',
				output: '',
				redaction: { reason: 'workflow_redaction_policy', canReveal: false },
			});
			expect(JSON.stringify(result)).not.toContain('tok_secret');
		});

		it('returns the output when no redaction applies', async () => {
			redactionFloor.get.mockResolvedValue('off');

			const result = await executeNodeFor(alice).execute({
				...secretNode,
				config: { parameters: {} },
			});

			expect(result).toMatchObject({ status: 'success' });
			expect(JSON.stringify(result)).toContain('tok_secret');
		});

		it('names the credential the user cannot use in a team project', async () => {
			redactionFloor.get.mockResolvedValue('off');

			const result = await executeNodeFor(owner, teamProject.id).execute({
				...secretNode,
				config: {
					parameters: {},
					credentials: { actionNetworkApi: { id: credential.id, name: credential.name } },
				},
			});

			expect(result).toMatchObject({
				status: 'error',
				error: {
					message: `Node "Node" uses the credential "${credential.name}", which you cannot use`,
				},
			});
		});
	});
});
