import type { Workspace, WorkspaceFilesystem } from '@n8n/agents';
import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { InstanceAiContext, InstanceAiExecutionService } from '@n8n/instance-ai';
import { calculateWorkflowChecksum } from 'n8n-workflow';
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
	const executionService = mock<InstanceAiExecutionService>();
	const filesystem = mock<WorkspaceFilesystem>();
	const workspace = mock<Workspace>({ filesystem });
	const service = new SelfHealingCandidateService(
		suggestions,
		temporaryWorkflows,
		logger,
		enterpriseWorkflows,
		license,
	);
	let source: string;
	let input: Parameters<SelfHealingCandidateService['verify']>[0];

	beforeEach(() => {
		vi.resetAllMocks();
		license.isSharingEnabled.mockReturnValue(false);
		enterpriseWorkflows.preventTampering.mockImplementation(async (workflow) => workflow);
		source = candidateSource('Repaired process');
		filesystem.readFile.mockImplementation(async () => source);
		suggestions.requireCurrentBaseline.mockResolvedValue(user);
		temporaryWorkflows.withTemporaryWorkflow.mockImplementation(async (_input, verify) => {
			return await verify('temporary-1');
		});
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
		vi.unstubAllEnvs();
	});

	it('validates the current source without creating or running a temporary workflow', async () => {
		const result = await service.verify({ ...input, validationOnly: true });

		expect(result).toMatchObject({
			filePath: input.filePath,
			candidateChecksum: expect.any(String),
			validation: { success: true },
			verification: { status: 'not_run' },
		});
		expect(temporaryWorkflows.withTemporaryWorkflow).not.toHaveBeenCalled();
		expect(executionService.run).not.toHaveBeenCalled();
	});

	it('identifies the graph after the builder credential checks restore protected nodes', async () => {
		license.isSharingEnabled.mockReturnValue(true);
		enterpriseWorkflows.preventTampering.mockResolvedValueOnce(baseline.original);

		const result = await service.verify({ ...input, validationOnly: true });

		expect(enterpriseWorkflows.preventTampering).toHaveBeenCalledWith(
			expect.objectContaining({
				nodes: expect.arrayContaining([expect.objectContaining({ name: 'Repaired process' })]),
			}),
			baseline.workflowId,
			user,
		);
		expect(result).toMatchObject({
			candidateChecksum: await calculateWorkflowChecksum(baseline.original),
			validation: { success: true },
			verification: { status: 'not_run' },
		});
		expect(temporaryWorkflows.withTemporaryWorkflow).not.toHaveBeenCalled();
		expect(executionService.run).not.toHaveBeenCalled();
	});

	it('stops before verification when the builder credential checks reject the candidate', async () => {
		license.isSharingEnabled.mockReturnValue(true);
		enterpriseWorkflows.preventTampering.mockRejectedValueOnce(
			new Error('The workflow credentials are unavailable.'),
		);

		await expect(service.verify(input)).rejects.toThrow(
			'The workflow credentials are unavailable.',
		);

		expect(temporaryWorkflows.withTemporaryWorkflow).not.toHaveBeenCalled();
		expect(executionService.run).not.toHaveBeenCalled();
	});

	it('returns compile diagnostics without creating or running a temporary workflow', async () => {
		source = '{invalid JSON';

		const result = await service.verify(input);

		expect(result).toMatchObject({
			validation: { success: false, reason: 'workflow_json_parse_failed' },
			verification: { status: 'not_run' },
		});
		expect(temporaryWorkflows.withTemporaryWorkflow).not.toHaveBeenCalled();
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
			temporaryWorkflows.withTemporaryWorkflow.mock.calls[1][0].graph.nodes.find(
				(node) => node.id === 'process-1',
			)?.name,
		).toBe('Second repair');
		expect(input.baseline).toEqual(baseline);
		expect(suggestions.createSuggestion).not.toHaveBeenCalled();
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

	it('rechecks the baseline before execution after planning completes', async () => {
		suggestions.requireCurrentBaseline
			.mockResolvedValueOnce(user)
			.mockRejectedValueOnce(new Error('The workflow baseline has changed.'));

		const result = await service.verify(input);

		expect(result).toMatchObject({
			verification: { success: false, error: 'The workflow baseline has changed.' },
		});
		expect(temporaryWorkflows.withTemporaryWorkflow).not.toHaveBeenCalled();
		expect(executionService.run).not.toHaveBeenCalled();
	});
});
