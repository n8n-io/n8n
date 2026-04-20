/**
 * Regression tests for N8N-9916: Different memory nodes read from the same memory
 *
 * Bug: When two different memory nodes (e.g., one attached to an Agent, another to a subagent)
 * use default session ID settings (from previous nodes), they will actually read and write
 * the same data, causing memories to leak into each other.
 *
 * Root cause: The memory key is constructed as `${workflowId}__${sessionId}` without any
 * node-specific identifier, so different memory nodes in the same workflow with the same
 * session ID will share the same memory storage.
 */

import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions, INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { MemoryBufferWindow } from './MemoryBufferWindow.node';

describe('MemoryBufferWindow - N8N-9916 memory isolation', () => {
	const WORKFLOW_ID = 'test-workflow-123';
	const SESSION_ID = 'user-session-456';

	// Note: These tests demonstrate the bug where the MemoryChatBufferSingleton
	// shares memory across different node instances when they have the same
	// workflowId and sessionId, even though they are different nodes

	function createMockContext(nodeName: string, nodeVersion = 1.3): ISupplyDataFunctions {
		const ctx = mock<ISupplyDataFunctions>();

		ctx.getWorkflow.mockReturnValue({
			id: WORKFLOW_ID,
			name: 'Test Workflow',
			active: false,
			nodes: [],
			connections: {},
			settings: {},
		});

		ctx.getNode.mockReturnValue({
			name: nodeName,
			type: 'memoryBufferWindow',
			typeVersion: nodeVersion,
			id: nodeName, // Use node name as ID to simulate different nodes
			parameters: {},
			position: [0, 0],
		} as INode);

		ctx.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'sessionIdType') return 'fromInput';
			if (paramName === 'contextWindowLength') return 5;
			return undefined;
		});

		// Mock evaluateExpression to return the session ID
		ctx.evaluateExpression.mockImplementation((expression: string) => {
			if (expression === '{{ $json.sessionId }}') return SESSION_ID;
			return undefined;
		});

		// Mock addInputData and addOutputData for log wrapper
		ctx.addInputData.mockReturnValue({ index: 0 });
		ctx.addOutputData.mockReturnValue({ index: 0 });

		return ctx;
	}

	it('should isolate memory between two different memory nodes with same session ID', async () => {
		// Create two different memory node instances simulating Agent and Subagent memories
		const memoryNode1 = new MemoryBufferWindow();
		const memoryNode2 = new MemoryBufferWindow();

		const ctx1 = createMockContext('Agent Memory');
		const ctx2 = createMockContext('Subagent Memory');

		// Supply data from both nodes - they should get different memory instances
		const result1 = await memoryNode1.supplyData.call(ctx1, 0);
		const result2 = await memoryNode2.supplyData.call(ctx2, 0);

		const memory1 = result1.response;
		const memory2 = result2.response;

		// Add a message to memory1
		await memory1.saveContext(
			{ input: 'Hello from Agent' },
			{ output: 'Response from Agent' },
		);

		// Check memory1 has the message
		const memory1Messages = await memory1.loadMemoryVariables({});
		expect(memory1Messages.chat_history).toHaveLength(2); // input + output

		// BUG: memory2 should be empty, but due to the bug it will also have the message
		// because both nodes share the same memory key: `${workflowId}__${sessionId}`
		const memory2Messages = await memory2.loadMemoryVariables({});

		// This assertion will FAIL, demonstrating the bug
		// Memory2 should be empty but will contain memory1's messages
		expect(memory2Messages.chat_history).toHaveLength(0);
	});

	it('should not leak memories when agent and subagent use different memory nodes', async () => {
		// Simulate a workflow with an Agent and a Subagent, each with their own memory
		const agentMemoryNode = new MemoryBufferWindow();
		const subagentMemoryNode = new MemoryBufferWindow();

		const agentCtx = createMockContext('Agent Memory Node');
		const subagentCtx = createMockContext('Subagent Memory Node');

		// Get memory instances for both
		const agentResult = await agentMemoryNode.supplyData.call(agentCtx, 0);
		const subagentResult = await subagentMemoryNode.supplyData.call(subagentCtx, 0);

		const agentMemory = agentResult.response;
		const subagentMemory = subagentResult.response;

		// Agent stores some context
		await agentMemory.saveContext(
			{ input: 'What is the user trying to accomplish?' },
			{ output: 'The user wants to book a flight' },
		);

		// Subagent stores different context
		await subagentMemory.saveContext(
			{ input: 'Search for flights from NYC to LAX' },
			{ output: 'Found 5 flights' },
		);

		// Load memories
		const agentMessages = await agentMemory.loadMemoryVariables({});
		const subagentMessages = await subagentMemory.loadMemoryVariables({});

		// BUG: Both memories will have ALL messages (4 total) instead of 2 each
		// Agent should only have its own 2 messages
		expect(agentMessages.chat_history).toHaveLength(2);

		// Subagent should only have its own 2 messages
		expect(subagentMessages.chat_history).toHaveLength(2);

		// They should have different content
		const agentContent = JSON.stringify(agentMessages.chat_history);
		const subagentContent = JSON.stringify(subagentMessages.chat_history);

		// This will FAIL - content will be identical due to shared memory
		expect(agentContent).not.toEqual(subagentContent);
	});

	it('should allow memory sharing when explicitly configured with same session key', async () => {
		// This test documents the INTENDED behavior when users want shared memory
		// (This test should pass even after the bug is fixed)

		const memoryNode1 = new MemoryBufferWindow();
		const memoryNode2 = new MemoryBufferWindow();

		// Both nodes explicitly configured with the same custom session key
		const ctx1 = createMockContext('Memory 1');
		const ctx2 = createMockContext('Memory 2');

		// Override to use custom session key mode (not default)
		ctx1.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'sessionIdType') return 'customKey';
			if (paramName === 'sessionKey') return 'shared-memory-key';
			if (paramName === 'contextWindowLength') return 5;
			return undefined;
		});

		ctx2.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'sessionIdType') return 'customKey';
			if (paramName === 'sessionKey') return 'shared-memory-key';
			if (paramName === 'contextWindowLength') return 5;
			return undefined;
		});

		const result1 = await memoryNode1.supplyData.call(ctx1, 0);
		const result2 = await memoryNode2.supplyData.call(ctx2, 0);

		const memory1 = result1.response;
		const memory2 = result2.response;

		// Add message to memory1
		await memory1.saveContext({ input: 'Shared message' }, { output: 'Shared response' });

		// memory2 SHOULD have the message (this is intentional sharing)
		const memory2Messages = await memory2.loadMemoryVariables({});
		expect(memory2Messages.chat_history).toHaveLength(2);
	});
});
