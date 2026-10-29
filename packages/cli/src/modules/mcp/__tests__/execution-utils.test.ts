import { LicenseState, Logger } from '@n8n/backend-common';
import { ExecutionRedactionServiceProxy, type EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import {
	NodeApiError,
	type INode,
	type IRunExecutionData,
	type WorkflowSettings,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks/credentials-permission-checker';
import { ExecutionRedactionService } from '@/modules/redaction/executions/execution-redaction.service';
import { FullItemRedactionStrategy } from '@/modules/redaction/executions/strategies/full-item-redaction.strategy';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { getRedactedRunErrorMessage, redactRunStartError } from '../tools/execution-utils';

describe('MCP execution error redaction', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const node: INode = {
		id: 'node-1',
		name: 'HTTP Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	const licenseState = mockInstance(LicenseState);
	const workflowFinderService = mockInstance(WorkflowFinderService);
	const credentialsPermissionChecker = mockInstance(CredentialsPermissionChecker);
	const proxy = new ExecutionRedactionServiceProxy();

	beforeEach(() => {
		vi.clearAllMocks();
		licenseState.isDataRedactionLicensed.mockReturnValue(true);
		workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());
		credentialsPermissionChecker.getCredentialIdsForNodes.mockReturnValue([]);
		credentialsPermissionChecker.resolveInaccessibleCredentialIdsForUser.mockResolvedValue([]);
		proxy.setExecutionRedaction(
			new ExecutionRedactionService(
				mockInstance(Logger),
				licenseState,
				workflowFinderService,
				mock<EventService>(),
				new FullItemRedactionStrategy(),
				credentialsPermissionChecker,
			),
		);
	});

	const makeRunData = (): Pick<IRunExecutionData, 'resultData' | 'executionData'> => ({
		resultData: {
			runData: {
				[node.name]: [
					{
						startTime: 0,
						executionTime: 1,
						executionIndex: 0,
						source: [],
						data: { main: [[{ json: { apiKey: 'sk-secret-123' } }]] },
						usedCredentialIds: ['sub-workflow-credential'],
					},
				],
			},
		},
		executionData: {
			contextData: {},
			runtimeData: {
				version: 1,
				establishedAt: 0,
				source: 'manual',
				credentials: 'encrypted-context',
				usesDynamicCredentials: true,
			},
			nodeExecutionStack: [],
			metadata: {},
			waitingExecution: {},
			waitingExecutionSource: null,
		},
	});

	const makeError = () =>
		new NodeApiError(node, { message: 'Unauthorized: sk-secret-123' }, { httpCode: '401' });

	const getMessage = async (
		redactionPolicy: WorkflowSettings.RedactionPolicy,
		data?: Pick<IRunExecutionData, 'resultData' | 'executionData'>,
	) =>
		await getRedactedRunErrorMessage(proxy, user, {
			executionId: 'exec-1',
			mode: 'manual',
			workflowId: 'wf-1',
			workflowData: { settings: { redactionPolicy }, nodes: [node] },
			data,
			error: makeError(),
		});

	test('hides the error details when the workflow policy redacts the execution', async () => {
		const message = await getMessage('all');

		expect(message).toBe(
			'Error details hidden by execution data redaction (NodeApiError, HTTP 401)',
		);
	});

	test('keeps the error when the workflow policy does not redact the execution', async () => {
		expect(await getMessage('non-manual')).toBeUndefined();
	});

	test('hides the error details when the run used a credential the user cannot use', async () => {
		credentialsPermissionChecker.resolveInaccessibleCredentialIdsForUser.mockResolvedValue([
			'sub-workflow-credential',
		]);
		const data = makeRunData();
		delete data.executionData!.runtimeData!.usesDynamicCredentials;

		const message = await getMessage('none', data);

		expect(message).toContain('Error details hidden by execution data redaction');
		expect(
			credentialsPermissionChecker.resolveInaccessibleCredentialIdsForUser,
		).toHaveBeenCalledWith(user, ['sub-workflow-credential'], { ignoreGlobalUseScope: true });
	});

	test('does not change the run data', async () => {
		const data = makeRunData();
		const original = structuredClone(data);

		const message = await getMessage('none', data);

		expect(message).toContain('Error details hidden by execution data redaction');
		expect(data).toEqual(original);
	});

	test('hides the details of an error that stops the execution from starting', async () => {
		const error = await redactRunStartError(
			proxy,
			user,
			{
				executionMode: 'manual',
				workflowData: {
					id: 'wf-1',
					name: 'Workflow',
					active: false,
					activeVersionId: null,
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					nodes: [node],
					connections: {},
					settings: { redactionPolicy: 'all' },
				},
			},
			new Error('start failed with sk-secret-123'),
		);

		expect(error.message).toBe('Error details hidden by execution data redaction (Error)');
	});

	test('returns the original start error when the policy does not redact the execution', async () => {
		const original = new Error('Queue is not available');

		const error = await redactRunStartError(
			proxy,
			user,
			{
				executionMode: 'manual',
				workflowData: {
					id: 'wf-1',
					name: 'Workflow',
					active: false,
					activeVersionId: null,
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					nodes: [node],
					connections: {},
					settings: { redactionPolicy: 'non-manual' },
				},
			},
			original,
		);

		expect(error).toBe(original);
	});

	test('keeps the HTTP status code of a start error when it hides the details', async () => {
		const error = await redactRunStartError(
			proxy,
			user,
			{
				executionMode: 'manual',
				workflowData: {
					id: 'wf-1',
					name: 'Workflow',
					active: false,
					activeVersionId: null,
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					nodes: [node],
					connections: {},
					settings: { redactionPolicy: 'all' },
				},
			},
			makeError(),
		);

		expect(error.message).toBe(
			'Error details hidden by execution data redaction (NodeApiError, HTTP 401)',
		);
	});

	test('hides the start error details when the established context uses dynamic credentials', async () => {
		const original = new Error('start failed with sk-secret-123');

		const error = await redactRunStartError(
			proxy,
			user,
			{
				executionMode: 'manual',
				workflowData: {
					id: 'wf-1',
					name: 'Workflow',
					active: false,
					activeVersionId: null,
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					nodes: [node],
					connections: {},
					settings: { redactionPolicy: 'none' },
				},
				executionData: { ...makeRunData(), startData: {} } as IRunExecutionData,
			},
			original,
		);

		expect(error).not.toBe(original);
		expect(error.message).toBe('Error details hidden by execution data redaction (Error)');
	});
});
