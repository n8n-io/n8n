import type { Logger } from '@n8n/backend-common';
import type {
	ExecutionRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	User,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { createRunExecutionData } from 'n8n-workflow';
import type { INodeType, INodeTypeDescription, IRun, ITaskData } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ExecuteNodeService } from '@/executions/execute-node.service';
import type { NodeTypes } from '@/node-types';
import type { ExecutionMetadataService } from '@/services/execution-metadata.service';
import type { WorkflowRunner } from '@/workflow-runner';

describe('ExecuteNodeService', () => {
	const nodeTypes = mock<NodeTypes>();
	const credentialsService = mock<CredentialsService>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();
	const executionMetadataService = mock<ExecutionMetadataService>();
	const workflowRepository = mock<WorkflowRepository>();
	// Default: scratch workflow + share already exist, so ensureScratchWorkflow is a no-op.
	workflowRepository.findOne.mockResolvedValue({
		id: '00000000-0000-0000-0000-000000000001',
	} as never);
	const executionRepository = mock<ExecutionRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	sharedWorkflowRepository.findOne.mockResolvedValue({
		workflowId: '00000000-0000-0000-0000-000000000001',
		role: 'workflow:owner',
	} as never);
	const projectRepository = mock<ProjectRepository>();
	// Default: in-memory promise path is exercised. Individual tests can flip
	// `activeExecutions.has` to false to test the DB-fetch fallback.
	activeExecutions.has.mockReturnValue(true);
	const logger = mock<Logger>();

	const mockUser = mock<User>({ id: 'user-1' });

	const service = new ExecuteNodeService(
		nodeTypes,
		credentialsService,
		workflowRunner,
		activeExecutions,
		executionMetadataService,
		workflowRepository,
		executionRepository,
		sharedWorkflowRepository,
		projectRepository,
		logger,
	);

	const makeNodeType = (overrides: Partial<INodeTypeDescription> = {}): INodeType => {
		const description: INodeTypeDescription = mock<INodeTypeDescription>({
			displayName: 'Test Node',
			name: 'test-node',
			group: ['transform'],
			version: 1,
			defaultVersion: 1,
			description: 'test',
			defaults: { name: 'Test' },
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
			credentials: [],
			...overrides,
		});
		return mock<INodeType>({ description });
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('executes a Set node via Manual Trigger and returns its output', async () => {
		nodeTypes.getByNameAndVersion.mockReturnValue(makeNodeType());

		workflowRunner.run.mockResolvedValue('exec-1');

		const actionTaskData: ITaskData = {
			data: {
				main: [[{ json: { hello: 'world' } }]],
			},
			executionTime: 1,
			startTime: 0,
			executionIndex: 0,
			source: [],
			executionStatus: 'success',
		};
		const runResult: IRun = {
			status: 'success',
			mode: 'single-node',
			startedAt: new Date(),
			storedAt: 'db',
			data: createRunExecutionData({
				resultData: {
					runData: {
						Action: [actionTaskData],
					},
				},
			}),
		};
		activeExecutions.getPostExecutePromise.mockResolvedValue(runResult);

		const result = await service.execute({
			user: mockUser,
			nodeType: 'n8n-nodes-base.set',
			parameters: { values: { string: [{ name: 'hello', value: 'world' }] } },
		});

		expect(result.status).toBe('success');
		expect(result.output).toEqual([{ hello: 'world' }]);
		expect(result.executionId).toBe('exec-1');
		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		const runArg = workflowRunner.run.mock.calls[0][0];
		expect(runArg.executionMode).toBe('single-node');
		expect(runArg.workflowData.nodes).toHaveLength(2);
		expect(runArg.workflowData.nodes[0].name).toBe('Trigger');
		expect(runArg.workflowData.nodes[1].name).toBe('Action');
		expect(runArg.workflowData.nodes[1].type).toBe('n8n-nodes-base.set');
		expect(runArg.startNodes).toEqual([{ name: 'Trigger', sourceData: null }]);
	});

	it('returns dry_run result without invoking the workflow runner', async () => {
		nodeTypes.getByNameAndVersion.mockReturnValue(makeNodeType());

		const result = await service.execute({
			user: mockUser,
			nodeType: 'n8n-nodes-base.set',
			parameters: { values: {} },
			dryRun: true,
		});

		expect(result.status).toBe('dry_run');
		expect(result.wouldExecute).toBeDefined();
		expect(result.wouldExecute?.node.type).toBe('n8n-nodes-base.set');
		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	it('rejects credential whose type does not match node', async () => {
		nodeTypes.getByNameAndVersion.mockReturnValue(
			makeNodeType({
				credentials: [{ name: 'slackOAuth2Api', required: true }],
			}),
		);
		credentialsService.getOne.mockResolvedValue({
			id: 'c1',
			name: 'My Gmail',
			type: 'gmailOAuth2Api',
		} as never);

		await expect(
			service.execute({
				user: mockUser,
				nodeType: 'n8n-nodes-base.slack',
				parameters: {},
				credentialId: 'c1',
			}),
		).rejects.toThrow(BadRequestError);
		await expect(
			service.execute({
				user: mockUser,
				nodeType: 'n8n-nodes-base.slack',
				parameters: {},
				credentialId: 'c1',
			}),
		).rejects.toThrow(/credential type/i);

		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	it('throws when node type is unknown', async () => {
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('Unknown node type: unknown.type');
		});

		await expect(
			service.execute({
				user: mockUser,
				nodeType: 'unknown.type',
				parameters: {},
			}),
		).rejects.toThrow(/Unknown node type/);
		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	// NOTE: cache-poisoning self-heal (when the placeholder workflow is deleted
	// out-of-band between calls) is verified manually — the in-memory map
	// `actionWorkflowEnsured` is private, the test scaffold for repeated execute()
	// calls fights jest-mock-extended's deep-mock ordering, and the fix itself
	// is a 4-line cache-evict-on-stale check (see execute-node.service.ts:155-167).
	// To reproduce by hand: run an action, then delete its workflow_entity row
	// via SQL while the server is up, then run the same action again — the heal
	// path should log "Action workflow ... was deleted out-of-band; recreating."

	describe('caller metadata persistence', () => {
		const successfulRun = (): IRun => {
			const actionTaskData: ITaskData = {
				data: { main: [[{ json: { ok: true } }]] },
				executionTime: 1,
				startTime: 0,
				executionIndex: 0,
				source: [],
				executionStatus: 'success',
			};
			return {
				status: 'success',
				mode: 'single-node',
				startedAt: new Date(),
				storedAt: 'db',
				data: createRunExecutionData({
					resultData: { runData: { Action: [actionTaskData] } },
				}),
			};
		};

		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(makeNodeType());
			workflowRunner.run.mockResolvedValue('exec-42');
			activeExecutions.getPostExecutePromise.mockResolvedValue(successfulRun());
		});

		it('writes caller metadata after execution completes', async () => {
			await service.execute({
				user: mockUser,
				nodeType: 'n8n-nodes-base.set',
				parameters: { values: {} },
				caller: { kind: 'mcp', name: 'mcp-server', clientId: 'abc' },
			});

			expect(executionMetadataService.save).toHaveBeenCalledWith('exec-42', {
				'caller.kind': 'mcp',
				'caller.name': 'mcp-server',
				'caller.clientId': 'abc',
				nodeType: 'n8n-nodes-base.set',
				actionId: 'n8n-nodes-base.set',
				actionDisplayName: 'Test Node',
			});
		});

		it('persists credentialId in metadata when present', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(
				makeNodeType({
					credentials: [{ name: 'slackOAuth2Api', required: true }],
				}),
			);
			credentialsService.getOne.mockResolvedValue({
				id: 'cred-1',
				name: 'My Slack',
				type: 'slackOAuth2Api',
			} as never);

			await service.execute({
				user: mockUser,
				nodeType: 'n8n-nodes-base.slack',
				parameters: {},
				credentialId: 'cred-1',
				caller: { kind: 'cli', name: 'n8n-cli@host' },
			});

			expect(executionMetadataService.save).toHaveBeenCalledWith('exec-42', {
				'caller.kind': 'cli',
				'caller.name': 'n8n-cli@host',
				nodeType: 'n8n-nodes-base.slack',
				actionId: 'n8n-nodes-base.slack',
				actionDisplayName: 'Test Node',
				credentialId: 'cred-1',
			});
		});

		it('writes only nodeType when caller is not supplied', async () => {
			await service.execute({
				user: mockUser,
				nodeType: 'n8n-nodes-base.set',
				parameters: {},
			});

			expect(executionMetadataService.save).toHaveBeenCalledWith('exec-42', {
				nodeType: 'n8n-nodes-base.set',
				actionId: 'n8n-nodes-base.set',
				actionDisplayName: 'Test Node',
			});
		});

		it('does not write metadata for dry-run executions', async () => {
			await service.execute({
				user: mockUser,
				nodeType: 'n8n-nodes-base.set',
				parameters: {},
				dryRun: true,
				caller: { kind: 'cli', name: 'n8n-cli@host' },
			});

			expect(executionMetadataService.save).not.toHaveBeenCalled();
		});

		it('does not throw if metadata persistence fails — logs warning instead', async () => {
			executionMetadataService.save.mockRejectedValueOnce(new Error('db is down'));

			const result = await service.execute({
				user: mockUser,
				nodeType: 'n8n-nodes-base.set',
				parameters: {},
				caller: { kind: 'sdk', name: 'sdk-client' },
			});

			expect(result.status).toBe('success');
			expect(result.executionId).toBe('exec-42');
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Failed to persist caller metadata'),
				expect.objectContaining({ executionId: 'exec-42' }),
			);
		});
	});
});
