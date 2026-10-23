import type { Workspace, WorkspaceFilesystem } from '@n8n/agents';
import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { InstanceWriteAccessService } from '@n8n/backend-services';
import type { User, WorkflowEntity } from '@n8n/db';
import { ConflictError, ForbiddenError } from '@n8n/errors';
import type { InstanceAiContext, InstanceAiExecutionService } from '@n8n/instance-ai';
import * as instanceAi from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';
import type { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import type { WorkflowSuggestionService } from '../../workflow-suggestions/workflow-suggestion.service';
import { SelfHealingCandidateService } from '../self-healing-candidate.service';
import type { SelfHealingTemporaryWorkflowService } from '../self-healing-temporary-workflow.service';

const user = mock<User>({ id: 'actor-1', disabled: false });
const baseline: WorkflowSuggestionBaseline = {
	workflowId: 'workflow-1',
	projectId: 'project-1',
	backgroundUserId: user.id,
	expectedBaseline: {
		savedVersionId: 'version-1',
		publishedVersionId: 'version-1',
		checksum: 'baseline-checksum',
		versionCounter: 1,
		latestPublishHistoryEventId: null,
	},
	original: {
		name: 'Captured workflow',
		nodes: [
			{
				id: 'trigger-1',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'process-1',
				name: 'Process',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [200, 0],
				parameters: {},
			},
		],
		connections: { Start: { main: [[{ node: 'Process', type: 'main', index: 0 }]] } },
		settings: { executionOrder: 'v1' },
	},
};

function candidateSource(
	nodeName: string,
	extraNodes: WorkflowSuggestionBaseline['original']['nodes'] = [],
): string {
	const workflow = structuredClone(baseline.original);
	workflow.nodes[1].name = nodeName;
	workflow.nodes.push(...extraNodes);
	workflow.connections.Start.main = [[{ node: nodeName, type: 'main', index: 0 }]];
	return JSON.stringify({ ...workflow, id: baseline.workflowId });
}

describe('SelfHealingCandidateService', () => {
	const suggestions = mock<WorkflowSuggestionService>();
	const temporaryWorkflows = mock<SelfHealingTemporaryWorkflowService>();
	const logger = mock<Logger>();
	const enterpriseWorkflows = mock<EnterpriseWorkflowService>();
	const license = mock<License>();
	const writeAccess = mock<InstanceWriteAccessService>();
	const executionService = mock<InstanceAiExecutionService>();
	const filesystem = mock<WorkspaceFilesystem>();
	const workspace = mock<Workspace>({ filesystem });
	const service = new SelfHealingCandidateService(
		suggestions,
		temporaryWorkflows,
		logger,
		enterpriseWorkflows,
		license,
		writeAccess,
	);
	let source: string;
	let input: Parameters<SelfHealingCandidateService['verify']>[0];

	beforeEach(() => {
		vi.resetAllMocks();
		writeAccess.isReadOnly.mockReturnValue(false);
		license.isSharingEnabled.mockReturnValue(false);
		enterpriseWorkflows.preventTampering.mockImplementation(async (workflow) => workflow);
		source = candidateSource('Repaired process');
		filesystem.readFile.mockImplementation(async () => source);
		suggestions.requireEditor.mockResolvedValue(user);
		temporaryWorkflows.create.mockResolvedValue(mock<WorkflowEntity>({ id: 'temporary-1' }));
		executionService.run.mockResolvedValue({
			executionId: 'verification-1',
			status: 'success',
			executedNodeNames: ['Start', 'Repaired process'],
			data: { 'Repaired process': [{ value: 'repaired' }] },
		});
		input = {
			user,
			baseline: structuredClone(baseline),
			filePath: 'self-healing/candidate.json',
			abortSignal: new AbortController().signal,
			context: mock<InstanceAiContext>({
				threadId: 'thread-1',
				runId: 'run-1',
				workspace,
				logger,
				executionService,
				workflowService: mock<InstanceAiContext['workflowService']>(),
				nodeService: mock<InstanceAiContext['nodeService']>(),
				credentialService: mock<InstanceAiContext['credentialService']>({
					list: async () => [],
					isAiGatewayCredentialType: undefined,
					isManagedOAuthCredentialType: undefined,
				}),
				nodeTypesProvider: undefined,
				outputSchemaLookup: undefined,
				modelId: undefined,
				allowSendingParameterValues: true,
			}),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it.each([false, true])(
		'skips execution planning on a protected instance with validationOnly=%s',
		async (validationOnly) => {
			const plan = vi.spyOn(instanceAi, 'planVerificationSimulation');
			writeAccess.isReadOnly.mockReturnValue(true);
			input.context.branchReadOnly = false;

			const result = await service.verify({ ...input, validationOnly });

			expect(result.validation).toMatchObject({ success: true });
			expect(result.verification).toEqual(
				validationOnly
					? { status: 'not_run' }
					: {
							status: 'not_run',
							error:
								'Cannot verify execution on a protected instance. This instance is in read-only mode.',
						},
			);
			expect(plan).not.toHaveBeenCalled();
			expect(temporaryWorkflows.create).not.toHaveBeenCalled();
			expect(executionService.run).not.toHaveBeenCalled();
		},
	);

	it.each([false, true])('validates unchanged preparation with sharing=%s', async (sharing) => {
		license.isSharingEnabled.mockReturnValue(sharing);
		const result = await service.verify({ ...input, validationOnly: true });

		expect(result).toMatchObject({
			filePath: input.filePath,
			candidateChecksum: expect.any(String),
			validation: { success: true },
			verification: { status: 'not_run' },
		});
		expect(temporaryWorkflows.create).not.toHaveBeenCalled();
		expect(executionService.run).not.toHaveBeenCalled();
	});

	it.each(['verify', 'compile'] as const)(
		'rejects restored node settings during %s',
		async (method) => {
			license.isSharingEnabled.mockReturnValue(true);
			const edited = structuredClone(baseline.original);
			edited.nodes[1].parameters = { value: 'edited' };
			source = JSON.stringify(edited);
			enterpriseWorkflows.preventTampering.mockImplementationOnce(async (workflow) => {
				workflow.nodes[1].parameters = {};
				return workflow;
			});

			const validation =
				method === 'verify'
					? (await service.verify(input)).validation
					: await service.compile(input, user);

			expect(enterpriseWorkflows.preventTampering).toHaveBeenCalledWith(
				expect.anything(),
				baseline.workflowId,
				user,
			);
			expect(validation).toMatchObject({
				success: false,
				reason: 'candidate_credential_access',
				errors: [expect.stringMatching(/Process.*needs_you without a candidate/)],
			});
			expect(temporaryWorkflows.create).not.toHaveBeenCalled();
			expect(executionService.run).not.toHaveBeenCalled();
		},
	);

	it('stops before verification when the builder credential checks reject the candidate', async () => {
		license.isSharingEnabled.mockReturnValue(true);
		enterpriseWorkflows.preventTampering.mockRejectedValueOnce(
			new Error('The workflow credentials are unavailable.'),
		);

		await expect(service.verify(input)).rejects.toThrow(
			'The workflow credentials are unavailable.',
		);

		expect(temporaryWorkflows.create).not.toHaveBeenCalled();
		expect(executionService.run).not.toHaveBeenCalled();
	});

	it('returns compile diagnostics without creating or running a temporary workflow', async () => {
		source = '{invalid JSON';

		const result = await service.verify(input);

		expect(result).toMatchObject({
			validation: { success: false, reason: 'workflow_json_parse_failed' },
			verification: { status: 'not_run' },
		});
		expect(temporaryWorkflows.create).not.toHaveBeenCalled();
		expect(executionService.run).not.toHaveBeenCalled();
	});

	it('recompiles each edit and verifies only the temporary workflow', async () => {
		const first = await service.verify(input);
		source = candidateSource('Second repair');
		executionService.run.mockResolvedValueOnce({
			executionId: 'verification-2',
			status: 'success',
			executedNodeNames: ['Start', 'Second repair'],
		});

		const second = await service.verify(input);

		expect(first).toMatchObject({
			candidateChecksum: expect.any(String),
			validation: { success: true },
			verification: { status: 'success', success: true, nodesNotReached: [] },
		});
		expect(second).toMatchObject({
			candidateChecksum: expect.any(String),
			validation: { success: true },
			verification: { status: 'success', success: true, nodesNotReached: [] },
		});
		expect(first).not.toHaveProperty('candidateChecksum', Reflect.get(second, 'candidateChecksum'));
		expect(filesystem.readFile).toHaveBeenCalledTimes(2);
		expect(executionService.run).toHaveBeenCalledTimes(2);
		for (const [workflowId, , options] of executionService.run.mock.calls) {
			expect(workflowId).toBe('temporary-1');
			expect(options).toMatchObject({ isVerificationRun: true, abortSignal: input.abortSignal });
		}
		expect(
			temporaryWorkflows.create.mock.calls[1][0].graph.nodes.find((node) => node.id === 'process-1')
				?.name,
		).toBe('Second repair');
		expect(temporaryWorkflows.cleanup).toHaveBeenCalledTimes(2);
		expect(temporaryWorkflows.cleanup).toHaveBeenCalledWith('temporary-1');
		expect(input.baseline).toEqual(baseline);
		expect(suggestions.createSuggestion).not.toHaveBeenCalled();
	});

	it('cleans up the temporary workflow when verification throws', async () => {
		executionService.run.mockRejectedValue(new Error('Execution failed'));

		await expect(service.verify(input)).resolves.toMatchObject({
			verification: { status: 'error', success: false, error: 'Execution failed' },
		});

		expect(temporaryWorkflows.cleanup).toHaveBeenCalledExactlyOnceWith('temporary-1');
	});

	it('does not run verification or cleanup when temporary workflow creation fails', async () => {
		temporaryWorkflows.create.mockRejectedValue(new Error('Creation failed'));

		await expect(service.verify(input)).resolves.toMatchObject({
			verification: { status: 'error', success: false, error: 'Creation failed' },
		});

		expect(executionService.run).not.toHaveBeenCalled();
		expect(temporaryWorkflows.cleanup).not.toHaveBeenCalled();
	});

	it('passes the selected webhook and its input when the candidate also has a schedule trigger', async () => {
		const workflow = structuredClone(baseline.original);
		workflow.nodes[0].type = 'n8n-nodes-base.scheduleTrigger';
		workflow.nodes.push(
			{
				...workflow.nodes[0],
				id: 'webhook-1',
				name: 'Incoming Order',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
			},
			{ ...workflow.nodes[1], id: 'order-1', name: 'Process Order' },
		);
		workflow.connections['Incoming Order'] = {
			main: [[{ node: 'Process Order', type: 'main', index: 0 }]],
		};
		source = JSON.stringify(workflow);
		const inputData = {
			body: { price: '12' },
			query: { currency: 'EUR' },
			headers: { 'content-type': 'application/json' },
			params: {},
		};
		executionService.run.mockResolvedValueOnce({
			executionId: 'webhook-verification',
			status: 'success',
			executedNodeNames: ['Incoming Order', 'Process Order'],
			data: { 'Process Order': [{ price: 12 }] },
		});

		const result = await service.verify({ ...input, triggerNodeName: 'Incoming Order', inputData });

		expect(executionService.run).toHaveBeenCalledWith(
			'temporary-1',
			inputData,
			expect.objectContaining({ triggerNodeName: 'Incoming Order', isVerificationRun: true }),
		);
		expect(result).toMatchObject({
			verification: {
				success: true,
				nodesExecuted: ['Incoming Order', 'Process Order'],
				nodesNotReached: ['Start', 'Process'],
			},
		});
	});

	it('simulates a read-only node when the builder cannot resolve its credentials', async () => {
		vi.stubEnv('N8N_INSTANCE_AI_MODEL_API_KEY', '');
		vi.stubEnv('N8N_AI_ANTHROPIC_KEY', '');
		vi.stubEnv('ANTHROPIC_API_KEY', '');
		const workflow = structuredClone(baseline.original);
		workflow.nodes[1] = {
			...workflow.nodes[1],
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			parameters: {
				method: 'GET',
				url: 'https://example.test/data',
				authentication: 'genericCredentialType',
				genericAuthType: 'httpHeaderAuth',
			},
			credentials: { httpHeaderAuth: { id: 'missing', name: 'Missing credential' } },
		};
		source = JSON.stringify({ ...workflow, id: baseline.workflowId });
		executionService.getResolvedNodeParameters.mockResolvedValueOnce({
			nodeName: 'Process',
			runIndex: 0,
			itemIndex: 0,
			parameters: {},
			resolved: '{}',
			failedExpressions: [],
			emptyResolutions: [],
		});
		executionService.run.mockResolvedValueOnce({
			executionId: 'verification-1',
			status: 'success',
			executedNodeNames: ['Start', 'Process'],
		});

		const result = await service.verify(input);

		expect(result).toMatchObject({
			credentialResolution: {
				mockedNodeNames: ['Process'],
				mockedCredentialsByNode: { Process: ['httpHeaderAuth'] },
			},
			verification: {
				success: true,
				simulatedNodes: [expect.objectContaining({ nodeName: 'Process' })],
			},
		});
		expect(executionService.run).toHaveBeenCalledWith(
			'temporary-1',
			undefined,
			expect.objectContaining({
				verificationPinData: { Process: [expect.any(Object)] },
			}),
		);
		expect(input.baseline).toEqual(baseline);
	});

	it('reports node failures and unreached nodes even when the engine returns success', async () => {
		executionService.run.mockResolvedValueOnce({
			executionId: 'verification-1',
			status: 'success',
			executedNodeNames: ['Start'],
			nodeErrors: [{ nodeName: 'Start', message: 'Invalid input' }],
		});

		const result = await service.verify(input);

		expect(result).toMatchObject({
			verification: {
				success: false,
				nodesNotReached: ['Repaired process'],
				nodeErrors: [{ nodeName: 'Start', message: 'Invalid input' }],
				coverageNote: expect.stringContaining('Repaired process'),
			},
		});
	});

	it('reports unreached triggers and disconnected nodes outside the simulation plan', async () => {
		source = candidateSource('Repaired process', [
			{ ...baseline.original.nodes[0], id: 'other-trigger', name: 'Other trigger' },
			{ ...baseline.original.nodes[1], id: 'isolated-1', name: 'Disconnected repair' },
			{ ...baseline.original.nodes[1], id: 'disabled-1', name: 'Disabled step', disabled: true },
		]);

		const result = await service.verify(input);

		expect(result).toMatchObject({
			validation: { success: true },
			verification: {
				success: true,
				nodesNotReached: ['Other trigger', 'Disconnected repair'],
			},
		});
	});

	it.each([false, true])(
		'verifies the captured candidate after the saved workflow changes (validationOnly: %s)',
		async (validationOnly) => {
			suggestions.requireCurrentBaseline.mockRejectedValue(
				new ConflictError('The workflow no longer matches the published baseline.'),
			);

			const result = await service.verify({ ...input, validationOnly });

			expect(result).toMatchObject({
				validation: { success: true },
				verification: validationOnly
					? { status: 'not_run' }
					: { status: 'success', success: true, nodesNotReached: [] },
			});
			expect(input.baseline).toEqual(baseline);
		},
	);

	it('rejects verification when the actor no longer has edit access', async () => {
		suggestions.requireEditor.mockRejectedValue(
			new ForbiddenError('Workflow edit access is required.'),
		);

		await expect(service.verify(input)).rejects.toThrow('Workflow edit access is required.');

		expect(filesystem.readFile).not.toHaveBeenCalled();
		expect(temporaryWorkflows.create).not.toHaveBeenCalled();
	});

	it('does not execute when temporary workflow creation rejects access', async () => {
		temporaryWorkflows.create.mockRejectedValue(
			new ForbiddenError('Workflow edit and execution access is required.'),
		);

		const result = await service.verify(input);

		expect(result).toMatchObject({
			verification: { success: false, error: 'Workflow edit and execution access is required.' },
		});
		expect(temporaryWorkflows.cleanup).not.toHaveBeenCalled();
		expect(executionService.run).not.toHaveBeenCalled();
	});
});
