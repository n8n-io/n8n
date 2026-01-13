import { mock } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions, INode, IntentoConnectionType, NodeExecutionWithMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { SupplyResponseBase } from '../../supply/*';
import { Tracer } from '../../tracing/tracer';
import type { IDescriptor } from '../../types/i-descriptor';
import { AgentBase } from '../agent-base';
import { AgentError } from '../agent-error';
import type { AgentRequestBase } from '../agent-request-base';
import { AgentResponseBase } from '../agent-response-base';

/**
 * Tests for AgentBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

type MockCalls = Array<[string, ...unknown[]]>;

// Test implementations
class TestAgentRequest implements AgentRequestBase {
	readonly agentRequestId: string;
	readonly requestedAt: number;
	private shouldThrowValidation = false;

	constructor() {
		this.agentRequestId = crypto.randomUUID();
		this.requestedAt = Date.now();
	}

	setValidationError(shouldThrow: boolean): void {
		this.shouldThrowValidation = shouldThrow;
	}

	throwIfInvalid(): void {
		if (this.shouldThrowValidation) {
			throw new Error('Invalid request');
		}
	}

	asLogMetadata(): IDataObject {
		return {
			agentRequestId: this.agentRequestId,
			requestedAt: this.requestedAt,
		};
	}

	asDataObject(): IDataObject {
		return {
			agentRequestId: this.agentRequestId,
			requestedAt: this.requestedAt,
		};
	}
}

class TestAgentResponse extends AgentResponseBase {
	private shouldThrowValidation = false;

	constructor(request: AgentRequestBase) {
		super(request);
	}

	setValidationError(shouldThrow: boolean): void {
		this.shouldThrowValidation = shouldThrow;
	}

	throwIfInvalid(): void {
		if (this.shouldThrowValidation) {
			throw new Error('Invalid response');
		}
	}

	asDataObject(): IDataObject {
		return {
			agentRequestId: this.agentRequestId,
			latencyMs: this.latencyMs,
			result: 'success',
		};
	}
}

class TestAgent extends AgentBase<TestAgentRequest, TestAgentResponse> {
	executeMock: jest.Mock<Promise<TestAgentResponse | AgentError>>;
	initializeMock: jest.Mock<Promise<void>>;

	constructor(descriptor: IDescriptor, functions: IExecuteFunctions) {
		super(descriptor, functions);
		this.executeMock = jest.fn<Promise<TestAgentResponse | AgentError>, [TestAgentRequest, AbortSignal]>();
		this.initializeMock = jest.fn<Promise<void>, [AbortSignal]>();
	}

	protected async initialize(signal: AbortSignal): Promise<void> {
		await this.initializeMock(signal);
	}

	protected async execute(request: TestAgentRequest, signal: AbortSignal): Promise<TestAgentResponse | AgentError> {
		return await this.executeMock(request, signal);
	}
}

describe('AgentBase', () => {
	let mockDescriptor: IDescriptor;
	let mockFunctions: IExecuteFunctions;
	let mockTracer: Tracer;
	let mockSignal: AbortSignal;
	let agent: TestAgent;
	let request: TestAgentRequest;

	beforeEach(() => {
		mockDescriptor = {
			name: 'TestAgent',
			symbol: '🧪',
			tool: 'test-tool',
			node: 'test-node',
			displayName: 'Test Agent',
			description: 'Test agent for unit testing',
		};

		mockFunctions = mock<IExecuteFunctions>({
			getNode: jest.fn().mockReturnValue({ name: 'Test Node' } as INode),
			getWorkflow: jest.fn().mockReturnValue({ active: true }),
			getExecutionId: jest.fn().mockReturnValue('exec-123'),
			getNodeParameter: jest.fn(),
			getWorkflowDataProxy: jest.fn().mockReturnValue({
				$execution: {
					customData: new Map(),
				},
			}),
			helpers: {
				constructExecutionMetaData: jest.fn().mockImplementation((data) => data as NodeExecutionWithMetadata[]),
			},
			getInputConnectionData: jest.fn(),
			continueOnFail: jest.fn().mockReturnValue(true),
		});

		mockTracer = mock<Tracer>();
		mockSignal = mock<AbortSignal>();

		// Spy on Tracer constructor to inject our mock
		jest.spyOn(Tracer.prototype, 'debug').mockImplementation(mockTracer.debug);
		jest.spyOn(Tracer.prototype, 'info').mockImplementation(mockTracer.info);
		jest.spyOn(Tracer.prototype, 'warn').mockImplementation(mockTracer.warn);
		jest.spyOn(Tracer.prototype, 'error').mockImplementation(mockTracer.error);

		agent = new TestAgent(mockDescriptor, mockFunctions);
		request = new TestAgentRequest();
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] constructor should initialize descriptor, functions, and tracer', () => {
			// ARRANGE & ACT
			const testAgent = new TestAgent(mockDescriptor, mockFunctions);

			// ASSERT
			expect(testAgent['descriptor']).toBe(mockDescriptor);
			expect(testAgent['functions']).toBe(mockFunctions);
			expect(testAgent['tracer']).toBeInstanceOf(Tracer);
		});

		it('[BL-02] initialize should be called exactly once on first run', async () => {
			// ARRANGE
			const response = new TestAgentResponse(request);
			agent.executeMock.mockResolvedValue(response);
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			await agent.run(request, mockSignal);
			await agent.run(request, mockSignal);

			// ASSERT
			expect(agent.initializeMock).toHaveBeenCalledTimes(1);
			expect(agent.initializeMock).toHaveBeenCalledWith(mockSignal);
		});

		it('[BL-03] initialize should check abort signal', async () => {
			// ARRANGE
			const throwSpy = jest.fn();
			mockSignal.throwIfAborted = throwSpy;
			const response = new TestAgentResponse(request);
			agent.executeMock.mockResolvedValue(response);
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			await agent.run(request, mockSignal);

			// ASSERT
			expect(throwSpy).toHaveBeenCalled();
		});

		it('[BL-04] run should execute successful workflow and return response data', async () => {
			// ARRANGE
			const response = new TestAgentResponse(request);
			agent.executeMock.mockResolvedValue(response);
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			const result = await agent.run(request, mockSignal);

			// ASSERT
			expect(result).toEqual([[{ json: response.asDataObject() }]]);
			expect(agent.executeMock).toHaveBeenCalledWith(request, mockSignal);
		});

		it('[BL-05] run should validate request before execution', async () => {
			// ARRANGE
			const response = new TestAgentResponse(request);
			agent.executeMock.mockResolvedValue(response);
			agent.initializeMock.mockResolvedValue(undefined);
			const validateSpy = jest.spyOn(request, 'throwIfInvalid');

			// ACT
			await agent.run(request, mockSignal);

			// ASSERT
			expect(validateSpy).toHaveBeenCalledTimes(1);
		});

		it('[BL-06] run should validate response after execution', async () => {
			// ARRANGE
			const response = new TestAgentResponse(request);
			const validateSpy = jest.spyOn(response, 'throwIfInvalid');
			agent.executeMock.mockResolvedValue(response);
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			await agent.run(request, mockSignal);

			// ASSERT
			expect(validateSpy).toHaveBeenCalledTimes(1);
		});

		it('[BL-07] run should call traceStart and traceCompletion', async () => {
			// ARRANGE
			const response = new TestAgentResponse(request);
			agent.executeMock.mockResolvedValue(response);
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			await agent.run(request, mockSignal);

			// ASSERT
			const debugCalls = (mockTracer.debug as jest.Mock).mock.calls as MockCalls;
			const infoCalls = (mockTracer.info as jest.Mock).mock.calls as MockCalls;
			expect(debugCalls.some((call) => call[0] === 'Executing agent...')).toBe(true);
			expect(infoCalls.some((call) => call[0] === 'Agent execution succeeded')).toBe(true);
		});

		it('[BL-08] run should check abort signal before and after execute', async () => {
			// ARRANGE
			const response = new TestAgentResponse(request);
			agent.executeMock.mockResolvedValue(response);
			agent.initializeMock.mockResolvedValue(undefined);
			const throwSpy = jest.fn();
			mockSignal.throwIfAborted = throwSpy;

			// ACT
			await agent.run(request, mockSignal);

			// ASSERT
			expect(throwSpy).toHaveBeenCalledTimes(3); // Once in initializeOnce, twice in run
		});

		it('[BL-09] getSuppliers should return array of suppliers when data is array', async () => {
			// ARRANGE
			const supplier1 = { name: 'Supplier1' };
			const supplier2 = { name: 'Supplier2' };
			const supplier3 = { name: 'Supplier3' };
			(mockFunctions.getInputConnectionData as jest.Mock).mockResolvedValue([supplier1, supplier2, supplier3]);

			// ACT
			const result = await agent.getSuppliers('intento:translation' as IntentoConnectionType, mockSignal);

			// ASSERT
			expect(result).toEqual([supplier3, supplier2, supplier1]); // Reversed for LTR priority
			expect(mockFunctions.getInputConnectionData).toHaveBeenCalledWith('intento:translation', 0);
		});

		it('[BL-10] getSuppliers should return single supplier as array when data is object', async () => {
			// ARRANGE
			const supplier = { name: 'SingleSupplier' };
			(mockFunctions.getInputConnectionData as jest.Mock).mockResolvedValue(supplier);

			// ACT
			const result = await agent.getSuppliers('intento:translation' as IntentoConnectionType, mockSignal);

			// ASSERT
			expect(result).toEqual([supplier]);
			const debugCalls = (mockTracer.debug as jest.Mock).mock.calls as MockCalls;
			expect(debugCalls.some((call) => call[0] === "Retrieved 1 supplier for connection type 'intento:translation'")).toBe(true);
		});

		it('[BL-11] getSuppliers should reverse supplier order for LTR priority', async () => {
			// ARRANGE
			const suppliers = [{ id: 1 }, { id: 2 }, { id: 3 }];
			(mockFunctions.getInputConnectionData as jest.Mock).mockResolvedValue(suppliers);

			// ACT
			const result = await agent.getSuppliers('intento:translation' as IntentoConnectionType, mockSignal);

			// ASSERT
			expect(result[0]).toEqual({ id: 3 });
			expect(result[1]).toEqual({ id: 2 });
			expect(result[2]).toEqual({ id: 1 });
		});
	});

	describe('edge cases', () => {
		it('[EC-01] run should return error output when response is AgentError', async () => {
			// ARRANGE
			const agentError = new AgentError(request, 500, 'Test error');
			agent.executeMock.mockResolvedValue(agentError);
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			const result = await agent.run(request, mockSignal);

			// ASSERT
			expect(result[0]).toEqual([{ json: { error: agentError.asDataObject() } }]);
			expect(mockFunctions.helpers.constructExecutionMetaData).toHaveBeenCalled();
		});

		it('[EC-02] run should handle response that is SupplyResponseBase subclass', async () => {
			// ARRANGE
			class TestSupplyResponse extends SupplyResponseBase {
				constructor(req: TestAgentRequest) {
					const supplyReq = {
						agentRequestId: req.agentRequestId,
						supplyRequestId: crypto.randomUUID(),
						requestedAt: req.requestedAt,
						throwIfInvalid: () => {},
						asLogMetadata: () => ({ agentRequestId: req.agentRequestId }),
						asDataObject: () => ({ agentRequestId: req.agentRequestId }),
					};
					super(supplyReq);
				}

				throwIfInvalid(): void {}

				asDataObject(): IDataObject {
					return { result: 'supply-response' };
				}
			}

			const supplyResponse = new TestSupplyResponse(request);
			agent.executeMock.mockResolvedValue(supplyResponse as unknown as TestAgentResponse);
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			const result = await agent.run(request, mockSignal);

			// ASSERT
			// SupplyResponseBase does not extend AgentResponseBase, so it's treated as an error
			expect(result).toEqual([[{ json: { error: supplyResponse.asDataObject() } }]]);
		});

		it('[EC-03] getSuppliers should return empty array when no connection data', async () => {
			// ARRANGE
			(mockFunctions.getInputConnectionData as jest.Mock).mockResolvedValue(null);

			// ACT
			const result = await agent.getSuppliers('intento:translation' as IntentoConnectionType, mockSignal);

			// ASSERT
			expect(result).toEqual([]);
		});

		it('[EC-04] getSuppliers should log warning when no suppliers found', async () => {
			// ARRANGE
			(mockFunctions.getInputConnectionData as jest.Mock).mockResolvedValue(null);

			// ACT
			await agent.getSuppliers('intento:translation' as IntentoConnectionType, mockSignal);

			// ASSERT
			const warnCalls = (mockTracer.warn as jest.Mock).mock.calls as MockCalls;
			expect(warnCalls.some((call) => call[0] === "No suppliers found for connection type 'intento:translation'")).toBe(true);
		});

		it('[EC-05] getSuppliers should log debug for array retrieval', async () => {
			// ARRANGE
			const suppliers = [{ id: 1 }, { id: 2 }];
			(mockFunctions.getInputConnectionData as jest.Mock).mockResolvedValue(suppliers);

			// ACT
			await agent.getSuppliers('intento:translation' as IntentoConnectionType, mockSignal);

			// ASSERT
			const debugCalls = (mockTracer.debug as jest.Mock).mock.calls as MockCalls;
			expect(debugCalls.some((call) => call[0] === "Retrieved 2 suppliers for connection type 'intento:translation'")).toBe(true);
		});

		it('[EC-06] getSuppliers should log debug for single retrieval', async () => {
			// ARRANGE
			const supplier = { id: 1 };
			(mockFunctions.getInputConnectionData as jest.Mock).mockResolvedValue(supplier);

			// ACT
			await agent.getSuppliers('intento:translation' as IntentoConnectionType, mockSignal);

			// ASSERT
			const debugCalls = (mockTracer.debug as jest.Mock).mock.calls as MockCalls;
			expect(debugCalls.some((call) => call[0] === "Retrieved 1 supplier for connection type 'intento:translation'")).toBe(true);
		});

		it('[EC-07] getSuppliers should check abort signal before retrieval', async () => {
			// ARRANGE
			const throwSpy = jest.fn();
			mockSignal.throwIfAborted = throwSpy;
			(mockFunctions.getInputConnectionData as jest.Mock).mockResolvedValue([]);

			// ACT
			await agent.getSuppliers('intento:translation' as IntentoConnectionType, mockSignal);

			// ASSERT
			expect(throwSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('error handling', () => {
		it('[EH-01] onError should convert TimeoutError to AgentError 408', () => {
			// ARRANGE
			const timeoutError = new DOMException('Timeout', 'TimeoutError');

			// ACT
			const result = agent['onError'](request, timeoutError);

			// ASSERT
			expect(result).toBeInstanceOf(AgentError);
			expect(result.code).toBe(408);
			expect(result.reason).toContain('timed out');
		});

		it('[EH-02] onError should log warning for timeout with reason', () => {
			// ARRANGE
			const timeoutError = new DOMException('Timeout', 'TimeoutError');

			// ACT
			agent['onError'](request, timeoutError);

			// ASSERT
			const warnCalls = (mockTracer.warn as jest.Mock).mock.calls as MockCalls;
			expect(warnCalls.some((call) => String(call[0]).includes('timed out'))).toBe(true);
		});

		it('[EH-03] onError should convert AbortError to AgentError 499', () => {
			// ARRANGE
			const abortError = new DOMException('Aborted', 'AbortError');

			// ACT
			const result = agent['onError'](request, abortError);

			// ASSERT
			expect(result).toBeInstanceOf(AgentError);
			expect(result.code).toBe(499);
			expect(result.reason).toContain('aborted');
		});

		it('[EH-04] onError should log warning for abort with reason', () => {
			// ARRANGE
			const abortError = new DOMException('Aborted', 'AbortError');

			// ACT
			agent['onError'](request, abortError);

			// ASSERT
			const warnCalls = (mockTracer.warn as jest.Mock).mock.calls as MockCalls;
			expect(warnCalls.some((call) => String(call[0]).includes('aborted'))).toBe(true);
		});

		it('[EH-05] onError should convert unexpected errors to AgentError 500', () => {
			// ARRANGE
			const unexpectedError = new Error('Something went wrong');

			// ACT
			const result = agent['onError'](request, unexpectedError);

			// ASSERT
			expect(result).toBeInstanceOf(AgentError);
			expect(result.code).toBe(500);
			expect(result.reason).toContain('Configuration error');
			expect(result.reason).toContain('Something went wrong');
		});

		it('[EH-06] onError should log error with details for unexpected errors', () => {
			// ARRANGE
			const unexpectedError = new Error('Unexpected failure');

			// ACT
			agent['onError'](request, unexpectedError);

			// ASSERT
			const errorCalls = (mockTracer.error as jest.Mock).mock.calls as MockCalls;
			expect(
				errorCalls.some((call) => {
					const message = String(call[0]);
					const meta = call[1] as { details?: Error };
					return message.includes('Configuration error') && meta.details === unexpectedError;
				}),
			).toBe(true);
		});

		it('[EH-07] run should catch errors during request validation', async () => {
			// ARRANGE
			request.setValidationError(true);
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			const result = await agent.run(request, mockSignal);

			// ASSERT
			expect(result[0][0].json).toHaveProperty('error');
			const errorCalls = (mockTracer.error as jest.Mock).mock.calls as MockCalls;
			expect(errorCalls.some((call) => String(call[0]) === 'Agent execution failed')).toBe(true);
		});

		it('[EH-08] run should catch errors during execution', async () => {
			// ARRANGE
			agent.executeMock.mockRejectedValue(new Error('Execution failed'));
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			const result = await agent.run(request, mockSignal);

			// ASSERT
			expect(result[0][0].json).toHaveProperty('error');
			const errorData = result[0][0].json.error as { code?: number };
			expect(errorData.code).toBe(500);
		});

		it('[EH-09] run should catch errors during response validation', async () => {
			// ARRANGE
			const response = new TestAgentResponse(request);
			response.setValidationError(true);
			agent.executeMock.mockResolvedValue(response);
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			const result = await agent.run(request, mockSignal);

			// ASSERT
			expect(result[0][0].json).toHaveProperty('error');
			const errorCalls = (mockTracer.error as jest.Mock).mock.calls as MockCalls;
			expect(errorCalls.some((call) => String(call[0]) === 'Agent execution failed')).toBe(true);
		});

		it('[EH-10] run should catch errors when signal aborts before execution', async () => {
			// ARRANGE
			mockSignal.throwIfAborted = jest.fn().mockImplementation(() => {
				throw new DOMException('Aborted', 'AbortError');
			});
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			const result = await agent.run(request, mockSignal);

			// ASSERT
			expect(result[0][0].json).toHaveProperty('error');
			const errorData = result[0][0].json.error as { code?: number };
			expect(errorData.code).toBe(499);
		});

		it('[EH-11] run should catch errors when signal aborts after execution', async () => {
			// ARRANGE
			const response = new TestAgentResponse(request);
			agent.executeMock.mockResolvedValue(response);
			agent.initializeMock.mockResolvedValue(undefined);
			let callCount = 0;
			mockSignal.throwIfAborted = jest.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 3) {
					throw new DOMException('Aborted', 'AbortError');
				}
			});

			// ACT
			const result = await agent.run(request, mockSignal);

			// ASSERT
			expect(result[0][0].json).toHaveProperty('error');
			const errorData = result[0][0].json.error as { code?: number };
			expect(errorData.code).toBe(499);
		});

		it('[EH-12] traceCompletion should log error for AgentError', async () => {
			// ARRANGE
			const agentError = new AgentError(request, 500, 'Test error');
			agent.executeMock.mockResolvedValue(agentError);
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			await agent.run(request, mockSignal);

			// ASSERT
			const errorCalls = (mockTracer.error as jest.Mock).mock.calls as MockCalls;
			expect(errorCalls.some((call) => String(call[0]) === 'Agent execution failed')).toBe(true);
		});

		it('[EH-13] traceCompletion should log info for successful response', async () => {
			// ARRANGE
			const response = new TestAgentResponse(request);
			agent.executeMock.mockResolvedValue(response);
			agent.initializeMock.mockResolvedValue(undefined);

			// ACT
			await agent.run(request, mockSignal);

			// ASSERT
			const infoCalls = (mockTracer.info as jest.Mock).mock.calls as MockCalls;
			expect(infoCalls.some((call) => String(call[0]) === 'Agent execution succeeded')).toBe(true);
		});

		it('[EH-14] run should catch errors during initialization', async () => {
			// ARRANGE
			agent.initializeMock.mockRejectedValue(new Error('Initialization failed'));

			// ACT
			const result = await agent.run(request, mockSignal);

			// ASSERT
			expect(result[0][0].json).toHaveProperty('error');
			const errorData = result[0][0].json.error as { code?: number };
			expect(errorData.code).toBe(500);
		});

		it('[EH-15] run should throw NodeOperationError when response is AgentError and continueOnFail is false', async () => {
			// ARRANGE
			const agentError = new AgentError(request, 500, 'Test error');
			agent.executeMock.mockResolvedValue(agentError);
			agent.initializeMock.mockResolvedValue(undefined);
			(mockFunctions.continueOnFail as jest.Mock).mockReturnValueOnce(false);

			// ACT & ASSERT
			await expect(agent.run(request, mockSignal)).rejects.toThrow(NodeOperationError);
		});
	});
});
