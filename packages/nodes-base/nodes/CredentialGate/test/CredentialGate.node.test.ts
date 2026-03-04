import type {
	CredentialGateResult,
	IExecuteFunctions,
	IExecutionContext,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { CredentialGate } from '../CredentialGate.node';

describe('CredentialGate Node', () => {
	let node: CredentialGate;

	beforeEach(() => {
		node = new CredentialGate();
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
		checkCredentialGate?:
			| ((wfId: string, ctx: IExecutionContext) => Promise<CredentialGateResult>)
			| null;
	}) => {
		const helpers: Record<string, unknown> = {};
		if (opts.checkCredentialGate !== null) {
			helpers.checkCredentialGate = opts.checkCredentialGate ?? jest.fn();
		}

		return {
			getInputData: () => inputItems,
			getExecutionContext: () =>
				opts.hasExecutionContext === false ? undefined : executionContext,
			getWorkflow: () => ({ id: opts.workflowId }),
			getNode: () => ({ name: 'Credential Gate', type: 'n8n-nodes-base.credentialGate' }),
			helpers,
		} as unknown as IExecuteFunctions;
	};

	describe('execute', () => {
		it('should route items to Ready output when all credentials are configured', async () => {
			const mockResult: CredentialGateResult = {
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
				checkCredentialGate: jest.fn().mockResolvedValue(mockResult),
			});

			const output = await node.execute.call(fns);

			expect(output[0]).toEqual(inputItems);
			expect(output[1]).toEqual([]);
		});

		it('should route items to Not Ready output with gate result data when credentials are missing', async () => {
			const mockResult: CredentialGateResult = {
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
				checkCredentialGate: jest.fn().mockResolvedValue(mockResult),
			});

			const output = await node.execute.call(fns);

			expect(output[0]).toEqual([]);
			expect(output[1]).toHaveLength(1);
			expect(output[1][0].json).toEqual({
				data: 'test',
				credentialGateResult: mockResult,
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

		it('should throw when checkCredentialGate helper is not available', async () => {
			const fns = createMockExecuteFunctions({
				workflowId: 'workflow-1',
				checkCredentialGate: null,
			});

			await expect(node.execute.call(fns)).rejects.toThrow(NodeOperationError);
		});
	});
});
