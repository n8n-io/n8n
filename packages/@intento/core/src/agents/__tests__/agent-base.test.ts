import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { SupplyError } from '../../supply/supply-error';
import type { SupplyRequestBase } from '../../supply/supply-request-base';
import { SupplyResponseBase } from '../../supply/supply-response-base';
import { Tracer } from '../../tracing/tracer';
import type { IDescriptor } from '../../types/i-descriptor';
import { AgentBase } from '../agent-base';

/**
 * Tests for AgentBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */

class TestResponse extends SupplyResponseBase {
	data: string;

	constructor(request: SupplyRequestBase, data: string) {
		super(request);
		this.data = data;
	}
}

class TestAgent extends AgentBase {
	initializeCalled = false;
	executeCalled = false;
	initializeSignal: AbortSignal | null = null;
	executeSignal: AbortSignal | null = null;
	private shouldThrowOnInit = false;
	private shouldThrowOnExecute = false;
	private executeResponse: SupplyResponseBase | SupplyError;

	constructor(descriptor: IDescriptor, functions: IExecuteFunctions, executeResponse: SupplyResponseBase | SupplyError) {
		super(descriptor, functions);
		this.executeResponse = executeResponse;
	}

	setShouldThrowOnInit(shouldThrow: boolean): void {
		this.shouldThrowOnInit = shouldThrow;
	}

	setShouldThrowOnExecute(shouldThrow: boolean): void {
		this.shouldThrowOnExecute = shouldThrow;
	}

	async initialize(signal: AbortSignal): Promise<void> {
		this.initializeCalled = true;
		this.initializeSignal = signal;
		if (this.shouldThrowOnInit) {
			throw new Error('Initialization failed');
		}
		await Promise.resolve();
	}

	async execute(signal: AbortSignal): Promise<SupplyResponseBase | SupplyError> {
		this.executeCalled = true;
		this.executeSignal = signal;
		if (this.shouldThrowOnExecute) {
			throw new Error('Execution failed');
		}
		await Promise.resolve();
		return this.executeResponse;
	}
}

describe('AgentBase', () => {
	let mockFunctions: ReturnType<typeof mock<IExecuteFunctions>>;
	let mockDescriptor: IDescriptor;
	let mockRequest: SupplyRequestBase;
	let mockAbortSignal: AbortSignal;

	beforeEach(() => {
		mockFunctions = mock<IExecuteFunctions>();
		mockFunctions.helpers = {
			constructExecutionMetaData: jest.fn().mockReturnValue([{ json: { error: {} }, pairedItem: { item: 0 } }]),
		} as unknown as IExecuteFunctions['helpers'];

		// Use Object.assign to bypass type checking for jest mock compatibility
		Object.assign(mockFunctions, {
			getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow-id' }),
			getNode: jest.fn().mockReturnValue({ id: 'test-node-id', name: 'Test Node' }),
			getExecutionId: jest.fn().mockReturnValue('test-execution-id'),
			getWorkflowDataProxy: jest.fn().mockReturnValue({
				$execution: {
					customData: new Map(),
				},
			}),
		});
		mockFunctions.logger = mock();

		mockDescriptor = {
			name: 'test-agent',
			symbol: '[TEST]',
			tool: 'test-tool',
			node: 'test-node',
			displayName: 'Test Agent',
			description: 'Test agent for testing',
		};

		mockRequest = {
			requestId: 'test-request-id',
			requestedAt: Date.now(),
			asLogMetadata: () => ({}),
			asDataObject: () => ({}),
		};

		mockAbortSignal = new AbortController().signal;

		jest.spyOn(Tracer.prototype, 'debug').mockImplementation();
		jest.spyOn(Tracer.prototype, 'info').mockImplementation();
		jest.spyOn(Tracer.prototype, 'error').mockImplementation();
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should execute workflow successfully with response', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			const result = await agent.run(mockAbortSignal);

			expect(result).toEqual([[{ json: testResponse.asDataObject() }]]);
			expect(agent.initializeCalled).toBe(true);
			expect(agent.executeCalled).toBe(true);
		});

		it('[BL-02] should execute workflow and return error', async () => {
			const supplyError = new SupplyError(mockRequest, 500, 'Test error', false);
			const agent = new TestAgent(mockDescriptor, mockFunctions, supplyError);

			const errorData = { json: { error: supplyError.asDataObject() }, pairedItem: { item: 0 } };
			(mockFunctions.helpers.constructExecutionMetaData as jest.Mock).mockReturnValue([errorData]);

			const result = await agent.run(mockAbortSignal);

			expect(mockFunctions.helpers.constructExecutionMetaData).toHaveBeenCalledWith([{ json: { error: supplyError.asDataObject() } }], {
				itemData: { item: 0 },
			});
			expect(result).toEqual([[errorData]]);
		});

		it('[BL-03] should call initialize before execute on first run', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			await agent.run(mockAbortSignal);

			expect(agent.initializeCalled).toBe(true);
			expect(agent.executeCalled).toBe(true);
		});

		it('[BL-04] should trace start before execution', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			await agent.run(mockAbortSignal);

			const debugCalls = (Tracer.prototype.debug as jest.Mock).mock.calls as unknown[][];
			expect(debugCalls[0][0]).toBe('[TEST] Executing agent...');
			expect(debugCalls[0][1]).toHaveProperty('context');
		});

		it('[BL-05] should trace completion after execution', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			await agent.run(mockAbortSignal);

			expect(Tracer.prototype.info).toHaveBeenCalledWith('[TEST] Agent execution succeeded', testResponse.asLogMetadata());
		});

		it('[BL-06] should extract ITraceable metadata for logging', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			await agent.run(mockAbortSignal);

			const debugCalls = (Tracer.prototype.debug as jest.Mock).mock.calls as unknown[][];
			expect(debugCalls[0][0]).toBe('[TEST] Executing agent...');
			const context = (debugCalls[0][1] as { context: unknown[] }).context;
			expect(Array.isArray(context)).toBe(true);
		});

		it('[BL-07] should format success response as n8n data', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			const result = await agent.run(mockAbortSignal);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0]).toEqual({ json: testResponse.asDataObject() });
		});

		it('[BL-08] should format error with n8n metadata wrapper', async () => {
			const supplyError = new SupplyError(mockRequest, 500, 'Test error', false);
			const agent = new TestAgent(mockDescriptor, mockFunctions, supplyError);

			await agent.run(mockAbortSignal);

			expect(mockFunctions.helpers.constructExecutionMetaData).toHaveBeenCalledWith([{ json: { error: supplyError.asDataObject() } }], {
				itemData: { item: 0 },
			});
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should not reinitialize on subsequent runs', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			await agent.run(mockAbortSignal);
			agent.initializeCalled = false;

			await agent.run(mockAbortSignal);

			expect(agent.initializeCalled).toBe(false);
			expect(agent.executeCalled).toBe(true);
		});

		it('[EC-02] should handle concurrent run calls without duplicate init', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			let initCount = 0;
			agent.initialize = async () => {
				initCount++;
				await new Promise((resolve) => setTimeout(resolve, 10));
			};

			await Promise.all([agent.run(mockAbortSignal), agent.run(mockAbortSignal)]);

			expect(initCount).toBe(1);
		});

		it('[EC-03] should handle agent with no ITraceable properties', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			await agent.run(mockAbortSignal);

			expect(Tracer.prototype.debug).toHaveBeenCalled();
		});

		it('[EC-04] should handle agent with multiple ITraceable properties', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			await agent.run(mockAbortSignal);

			const debugCalls = (Tracer.prototype.debug as jest.Mock).mock.calls as unknown[][];
			const context = (debugCalls[0][1] as { context: unknown[] }).context;
			expect(Array.isArray(context)).toBe(true);
		});

		it('[EC-05] should pass AbortSignal to initialize', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			await agent.run(mockAbortSignal);

			expect(agent.initializeSignal).toBe(mockAbortSignal);
		});

		it('[EC-06] should pass AbortSignal to execute', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			await agent.run(mockAbortSignal);

			expect(agent.executeSignal).toBe(mockAbortSignal);
		});

		it('[EC-07] should construct error output with item 0 index', async () => {
			const supplyError = new SupplyError(mockRequest, 500, 'Test error', false);
			const agent = new TestAgent(mockDescriptor, mockFunctions, supplyError);

			await agent.run(mockAbortSignal);

			expect(mockFunctions.helpers.constructExecutionMetaData).toHaveBeenCalledWith(expect.any(Array), { itemData: { item: 0 } });
		});
	});

	describe('error handling', () => {
		it('[EH-01] should propagate initialization errors', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);
			agent.setShouldThrowOnInit(true);

			await expect(agent.run(mockAbortSignal)).rejects.toThrow('Initialization failed');
		});

		it('[EH-02] should propagate execution errors', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);
			agent.setShouldThrowOnExecute(true);

			await expect(agent.run(mockAbortSignal)).rejects.toThrow('Execution failed');
		});

		it('[EH-03] should trace error completion for SupplyError', async () => {
			const supplyError = new SupplyError(mockRequest, 500, 'Test error', false);
			const agent = new TestAgent(mockDescriptor, mockFunctions, supplyError);

			await agent.run(mockAbortSignal);

			expect(Tracer.prototype.error).toHaveBeenCalledWith('[TEST] Agent execution failed', supplyError.asLogMetadata());
		});

		it('[EH-04] should trace success completion for SupplyResponseBase', async () => {
			const testResponse = new TestResponse(mockRequest, 'test-data');
			const agent = new TestAgent(mockDescriptor, mockFunctions, testResponse);

			await agent.run(mockAbortSignal);

			expect(Tracer.prototype.info).toHaveBeenCalledWith('[TEST] Agent execution succeeded', testResponse.asLogMetadata());
		});
	});
});
