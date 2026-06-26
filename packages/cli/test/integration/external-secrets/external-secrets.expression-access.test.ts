/**
 * Integration test verifying that $secrets is not accessible in regular node
 * expressions outside of a credential context.
 *
 * Mocks ExternalSecretsProxy to serve a known secret, then drives a workflow
 * through WorkflowExecutionService where a node expression attempts to read
 * that secret. The secret must not appear in the execution output.
 */

import { LicenseState } from '@n8n/backend-common';
import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import { ExternalSecretsProxy } from 'n8n-core';
import type {
	ICredentialType,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeData,
} from 'n8n-workflow';
import { isTerminalExecutionStatus, NodeConnectionTypes } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { saveCredential } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';
import { loadNodesFromDist } from '../shared/utils/node-types-data';

const SECRET_VALUE = 'top-secret-value-xyz-789';
const SECRET_NAME = 'mySecret';
const PROVIDER_NAME = 'testSecretsProvider';

// This is needed because resolving external secrets is behind a license gate
const licenseMock = mockInstance(LicenseState);
licenseMock.isLicensed.mockReturnValue(true);

const CREDENTIAL_TYPE_NAME = 'secretsTestCredential';
const ECHO_NODE_TYPE = 'n8n-nodes-base.credentialSecretsEcho';

const secretsTestCredential: ICredentialType = {
	name: CREDENTIAL_TYPE_NAME,
	displayName: 'Secrets Test Credential',
	properties: [{ displayName: 'API Key', name: 'apiKey', type: 'string', default: '' }],
};

// mock node type that requires a credential and outputs its resolved value
const credentialSecretsEchoNode: INodeType = {
	description: {
		displayName: 'Credential Secrets Echo',
		name: 'credentialSecretsEcho',
		group: ['transform'],
		version: 1,
		description: 'Echoes the resolved credential apiKey — test-only node',
		defaults: { name: 'Credential Echo' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: CREDENTIAL_TYPE_NAME, required: true }],
		properties: [],
	},
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials(CREDENTIAL_TYPE_NAME);
		return [[{ json: { resolvedSecret: credentials.apiKey } }]];
	},
};

// mockInstance must be called at module level so the DI container entry is
// replaced before testDb.init() or any Container.get() can cache the real service.
const mockExternalSecretsProxy = mockInstance(ExternalSecretsProxy);

function configureMockProxy() {
	mockExternalSecretsProxy.hasProvider.mockImplementation(
		(provider: string) => provider === PROVIDER_NAME,
	);
	mockExternalSecretsProxy.hasSecret.mockImplementation(
		(provider: string, name: string) => provider === PROVIDER_NAME && name === SECRET_NAME,
	);
	mockExternalSecretsProxy.getSecret.mockImplementation((provider: string, name: string) =>
		provider === PROVIDER_NAME && name === SECRET_NAME ? SECRET_VALUE : undefined,
	);
	mockExternalSecretsProxy.listProviders.mockReturnValue([PROVIDER_NAME]);
	mockExternalSecretsProxy.listSecrets.mockImplementation((provider: string) =>
		provider === PROVIDER_NAME ? [SECRET_NAME] : [],
	);
}

describe('External secrets — expression access', () => {
	let workflowExecutionService: WorkflowExecutionService;
	let executionRepository: ExecutionRepository;
	let owner: Awaited<ReturnType<typeof createOwner>>;

	beforeAll(async () => {
		await testDb.init();

		const nodeTypes: INodeTypeData = {
			...loadNodesFromDist(['n8n-nodes-base.manualTrigger', 'n8n-nodes-base.set']),
			[ECHO_NODE_TYPE]: { type: credentialSecretsEchoNode, sourcePath: '' },
		};
		await utils.initNodeTypes(nodeTypes);

		const lnc = Container.get(LoadNodesAndCredentials);

		// initNodeTypes installs a mock DirectoryLoader whose known.credentials is empty,
		// so getCredential() falls through to loaded.credentials. Register the test-only
		// credential type there so CredentialsHelper can look it up during execution.
		lnc.loaded.credentials = {
			...lnc.loaded.credentials,
			[CREDENTIAL_TYPE_NAME]: { type: secretsTestCredential, sourcePath: '' },
		};

		await utils.initBinaryDataService();

		owner = await createOwner();
		workflowExecutionService = Container.get(WorkflowExecutionService);
		executionRepository = Container.get(ExecutionRepository);

		configureMockProxy();
	});

	beforeEach(() => {
		// Clear call history between tests, then re-apply implementations so each
		// test starts with a clean slate but a fully configured mock.
		jest.clearAllMocks();
		configureMockProxy();
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function waitForExecution(executionId: string, timeout = 10_000): Promise<void> {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const execution = await executionRepository.findOneBy({ id: executionId });
			if (isTerminalExecutionStatus(execution?.status)) return;
			await new Promise((r) => setTimeout(r, 50));
		}
		throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
	}

	it('should not resolve $secrets in a node expression outside credential context', async () => {
		const workflow = await createWorkflow(
			{
				name: 'Secrets Expression Access Test',
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						name: 'Edit Fields',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 0],
						parameters: {
							assignments: {
								assignments: [
									{
										id: 'a6f3f0aa-f857-46df-b195-8fa3d53dbf85',
										name: 'secretValue',
										value: `={{ $secrets.${PROVIDER_NAME}.${SECRET_NAME} }}`,
										type: 'string',
									},
								],
							},
							options: {},
						},
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'Edit Fields', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			} as unknown as IWorkflowDb,
			owner,
		);

		const result = await workflowExecutionService.executeManually(
			workflow,
			{ triggerToStartFrom: { name: 'Trigger' } },
			owner,
			undefined,
			undefined,
		);

		if (!('executionId' in result)) {
			throw new Error(`Expected executionId, got ${JSON.stringify(result)}`);
		}

		await waitForExecution(result.executionId);

		const execution = await executionRepository.findSingleExecution(result.executionId, {
			includeData: true,
			unflattenData: true,
		});

		const runData = execution!.data.resultData.runData;
		const setOutput = runData['Edit Fields'][0].data!.main[0]![0].json;

		// Set node must have run and produced output
		expect(setOutput).toBeDefined();

		// $secrets is undefined in a non-credential context (isCredential: false), so
		// getSecretsProxy is never called and the proxy methods are never reached.
		expect(mockExternalSecretsProxy.hasProvider.mock.calls).toHaveLength(0);
		expect(mockExternalSecretsProxy.getSecret.mock.calls).toHaveLength(0);

		// The expression must have failed to resolve — the field must be absent/falsy,
		expect(setOutput.secretValue).toBeFalsy();
		// Failsafe assertion to verify that the resolved value isn't somewhere else in the rundata:
		expect(JSON.stringify(runData)).not.toContain(SECRET_VALUE);
	});

	it('should resolve $secrets in a credential expression', async () => {
		const credential = await saveCredential(
			{
				name: 'Test Secrets Credential',
				type: CREDENTIAL_TYPE_NAME,
				data: { apiKey: `={{ $secrets.${PROVIDER_NAME}.${SECRET_NAME} }}` },
			},
			{ user: owner, role: 'credential:owner' },
		);

		const workflow = await createWorkflow(
			{
				name: 'Secrets Credential Expression Test',
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						name: 'Credential Echo',
						type: ECHO_NODE_TYPE,
						typeVersion: 1,
						position: [200, 0],
						parameters: {},
						credentials: {
							[CREDENTIAL_TYPE_NAME]: { id: credential.id, name: credential.name },
						},
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'Credential Echo', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			} as unknown as IWorkflowDb,
			owner,
		);

		const result = await workflowExecutionService.executeManually(
			workflow,
			{ triggerToStartFrom: { name: 'Trigger' } },
			owner,
			undefined,
			undefined,
		);

		if (!('executionId' in result)) {
			throw new Error(`Expected executionId, got ${JSON.stringify(result)}`);
		}

		await waitForExecution(result.executionId);

		const execution = await executionRepository.findSingleExecution(result.executionId, {
			includeData: true,
			unflattenData: true,
		});

		const runData = execution!.data.resultData.runData;
		const echoOutput = runData['Credential Echo'][0].data!.main[0]![0].json;
		expect(echoOutput.resolvedSecret).toBe(SECRET_VALUE);
	});
});
