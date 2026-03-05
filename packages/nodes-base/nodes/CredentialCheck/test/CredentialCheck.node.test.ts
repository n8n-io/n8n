import type {
	CredentialCheckResult,
	IExecuteFunctions,
	IExecutionContext,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { CredentialCheck } from '../CredentialCheck.node';

describe('CredentialCheck Node', () => {
	let node: CredentialCheck;

	beforeEach(() => {
		node = new CredentialCheck();
	});

	const inputItems: INodeExecutionData[] = [{ json: { data: 'test' } }];

	const executionContext: IExecutionContext = {
		version: 1,
		establishedAt: Date.now(),
		source: 'webhook',
		credentials: 'encrypted-credentials',
	};

	const createMockExecuteFunctions = (opts: {
		hasExecutionContext?: boolean;
		workflowId?: string;
		checkCredentialStatus?:
			| ((wfId: string, ctx: IExecutionContext) => Promise<CredentialCheckResult>)
			| null;
	}) => {
		const helpers: Record<string, unknown> = {};
		if (opts.checkCredentialStatus !== null) {
			helpers.checkCredentialStatus = opts.checkCredentialStatus ?? jest.fn();
		}

		return {
			getInputData: () => inputItems,
			getExecutionContext: () =>
				opts.hasExecutionContext === false ? undefined : executionContext,
			getWorkflow: () => ({ id: opts.workflowId }),
			getNode: () => ({ name: 'Credential Check', type: 'n8n-nodes-base.credentialCheck' }),
			helpers,
		} as unknown as IExecuteFunctions;
	};

	describe('execute', () => {
		it('should route items to Ready output when all credentials are configured', async () => {
			const mockResult: CredentialCheckResult = {
				readyToExecute: true,
				credentials: [
					{
						credentialId: 'cred-1',
						credentialName: 'OAuth2 API',
						credentialType: 'oauth2Api',
						resolverId: 'resolver-1',
						status: 'configured',
					},
				],
			};

			const fns = createMockExecuteFunctions({
				workflowId: 'workflow-1',
				checkCredentialStatus: jest.fn().mockResolvedValue(mockResult),
			});

			const output = await node.execute.call(fns);

			expect(output[0]).toEqual(inputItems);
			expect(output[1]).toEqual([]);
		});

		it('should route items to Not Ready output with check result data when credentials are missing', async () => {
			const mockResult: CredentialCheckResult = {
				readyToExecute: false,
				credentials: [
					{
						credentialId: 'cred-1',
						credentialName: 'OAuth2 API',
						credentialType: 'oauth2Api',
						resolverId: 'resolver-1',
						status: 'missing',
						authorizationUrl: 'https://auth.example.com',
					},
				],
			};

			const fns = createMockExecuteFunctions({
				workflowId: 'workflow-1',
				checkCredentialStatus: jest.fn().mockResolvedValue(mockResult),
			});

			const output = await node.execute.call(fns);

			expect(output[0]).toEqual([]);
			expect(output[1]).toHaveLength(1);
			expect(output[1][0].json).toEqual({
				data: 'test',
				credentialCheckResult: mockResult,
			});
		});

		it('should throw when no execution context is available', async () => {
			const fns = createMockExecuteFunctions({
				hasExecutionContext: false,
				workflowId: 'workflow-1',
			});

			await expect(node.execute.call(fns)).rejects.toThrow(NodeOperationError);
		});

		it('should throw when workflow ID is not available', async () => {
			const fns = createMockExecuteFunctions({
				workflowId: undefined,
			});

			await expect(node.execute.call(fns)).rejects.toThrow(NodeOperationError);
		});

		it('should throw when checkCredentialStatus helper is not available', async () => {
			const fns = createMockExecuteFunctions({
				workflowId: 'workflow-1',
				checkCredentialStatus: null,
			});

			await expect(node.execute.call(fns)).rejects.toThrow(NodeOperationError);
		});
	});
});
