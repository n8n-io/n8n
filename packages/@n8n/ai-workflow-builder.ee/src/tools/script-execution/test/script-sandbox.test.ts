import type { WorkflowOperation } from '../../../types/workflow';
import { ScriptTimeoutError } from '../errors';
import { executeScript, validateScriptSyntax } from '../script-sandbox';
import type { ScriptTools, WorkflowSnapshot } from '../tool-interfaces';

describe('Script Sandbox', () => {
	const mockWorkflow: WorkflowSnapshot = {
		name: 'Test Workflow',
		nodes: [
			{
				id: 'node-1',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				position: [0, 0],
				parameters: {},
			},
		],
		connections: [],
		getNodeById: jest.fn((id) =>
			id === 'node-1'
				? {
						id: 'node-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0] as [number, number],
						parameters: {},
					}
				: undefined,
		),
		getNodeByName: jest.fn((name) =>
			name === 'Manual Trigger'
				? {
						id: 'node-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0] as [number, number],
						parameters: {},
					}
				: undefined,
		),
		getNodesByType: jest.fn(() => []),
	};

	const createMockTools = (): ScriptTools => ({
		addNode: jest.fn().mockResolvedValue({ success: true, nodeId: 'new-node-1' }),
		connectNodes: jest.fn().mockResolvedValue({ success: true }),
		removeNode: jest.fn().mockResolvedValue({ success: true }),
		removeConnection: jest.fn().mockResolvedValue({ success: true }),
		renameNode: jest.fn().mockResolvedValue({ success: true }),
		validateStructure: jest.fn().mockResolvedValue({ success: true, isValid: true }),
		updateNodeParameters: jest
			.fn()
			.mockResolvedValue({ success: true, updatedParameters: {}, appliedChanges: [] }),
		getNodeParameter: jest.fn().mockResolvedValue({ success: true, value: undefined }),
		validateConfiguration: jest.fn().mockResolvedValue({ success: true, isValid: true }),
	});

	describe('executeScript', () => {
		it('should execute a simple script successfully', async () => {
			const tools = createMockTools();
			const operations: WorkflowOperation[] = [];

			const result = await executeScript(
				`
				const result = await tools.addNode({
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeVersion: 1,
					name: 'HTTP Request',
					initialParametersReasoning: 'Test',
					initialParameters: {}
				});
				console.log('Added node:', result.nodeId);
				`,
				{ workflow: mockWorkflow, tools },
				() => operations,
			);

			expect(result.success).toBe(true);
			expect(tools.addNode).toHaveBeenCalled();
			expect(result.consoleOutput).toContain('[LOG] Added node: new-node-1');
		});

		it('should capture console output', async () => {
			const tools = createMockTools();
			const operations: WorkflowOperation[] = [];

			const result = await executeScript(
				`
				console.log('Hello');
				console.warn('Warning');
				console.error('Error');
				`,
				{ workflow: mockWorkflow, tools },
				() => operations,
			);

			expect(result.success).toBe(true);
			expect(result.consoleOutput).toContain('[LOG] Hello');
			expect(result.consoleOutput).toContain('[WARN] Warning');
			expect(result.consoleOutput).toContain('[ERROR] Error');
		});

		it('should handle script errors', async () => {
			const tools = createMockTools();
			const operations: WorkflowOperation[] = [];

			const result = await executeScript(
				`
				throw new Error('Test error');
				`,
				{ workflow: mockWorkflow, tools },
				() => operations,
			);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain('Test error');
		});

		it('should provide access to workflow state', async () => {
			const tools = createMockTools();
			const operations: WorkflowOperation[] = [];

			const result = await executeScript(
				`
				const node = workflow.getNodeById('node-1');
				console.log('Found node:', node?.name);
				`,
				{ workflow: mockWorkflow, tools },
				() => operations,
			);

			expect(result.success).toBe(true);
			expect(result.consoleOutput).toContain('[LOG] Found node: Manual Trigger');
			expect(mockWorkflow.getNodeById).toHaveBeenCalledWith('node-1');
		});

		it('should timeout long-running scripts', async () => {
			const tools = createMockTools();
			const operations: WorkflowOperation[] = [];

			const result = await executeScript(
				`
				await new Promise(resolve => setTimeout(resolve, 5000));
				`,
				{ workflow: mockWorkflow, tools, timeout: 100 },
				() => operations,
			);

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(ScriptTimeoutError);
		});

		it('should block access to dangerous globals', async () => {
			const tools = createMockTools();
			const operations: WorkflowOperation[] = [];

			// Try to access require/process which should not be available
			const result = await executeScript(
				`
				try {
					const fs = require('fs');
					console.log('Should not reach here');
				} catch (e) {
					console.log('Blocked:', e.message);
				}
				`,
				{ workflow: mockWorkflow, tools },
				() => operations,
			);

			expect(result.success).toBe(true);
			expect(result.consoleOutput.some((o) => o.includes('Blocked'))).toBe(true);
		});

		it('should collect partial operations on error', async () => {
			const operations: WorkflowOperation[] = [];
			const tools: ScriptTools = {
				...createMockTools(),
				addNode: jest.fn().mockImplementation(async () => {
					operations.push({ type: 'addNodes', nodes: [] });
					return { success: true, nodeId: 'test' };
				}),
			};

			const result = await executeScript(
				`
				await tools.addNode({
					nodeType: 'test',
					nodeVersion: 1,
					name: 'Test',
					initialParametersReasoning: 'Test',
					initialParameters: {}
				});
				throw new Error('After first operation');
				`,
				{ workflow: mockWorkflow, tools },
				() => operations,
			);

			expect(result.success).toBe(false);
			expect(result.operations).toHaveLength(1);
		});
	});

	describe('ergonomic connectNodes API', () => {
		it('should allow passing AddNodeResult objects directly to connectNodes', async () => {
			const connectNodesCalls: unknown[] = [];
			const tools: ScriptTools = {
				...createMockTools(),
				addNode: jest
					.fn()
					.mockResolvedValueOnce({
						success: true,
						nodeId: 'trigger-id-123',
						nodeName: 'Trigger',
						nodeType: 'n8n-nodes-base.manualTrigger',
					})
					.mockResolvedValueOnce({
						success: true,
						nodeId: 'http-id-456',
						nodeName: 'HTTP Request',
						nodeType: 'n8n-nodes-base.httpRequest',
					}),
				connectNodes: jest
					.fn()
					.mockImplementation(async (input: { sourceNodeId: unknown; targetNodeId: unknown }) => {
						connectNodesCalls.push(input);
						// Simulate the real resolveNodeId behavior
						const sourceId =
							typeof input.sourceNodeId === 'string'
								? input.sourceNodeId
								: (input.sourceNodeId as { nodeId?: string } | null)?.nodeId;
						const targetId =
							typeof input.targetNodeId === 'string'
								? input.targetNodeId
								: (input.targetNodeId as { nodeId?: string } | null)?.nodeId;
						return {
							success: true,
							sourceNodeId: sourceId,
							targetNodeId: targetId,
						};
					}),
			};
			const operations: WorkflowOperation[] = [];

			const result = await executeScript(
				`
				// Create nodes
				const trigger = await tools.addNode({
					nodeType: 'n8n-nodes-base.manualTrigger',
					nodeVersion: 1,
					name: 'Trigger',
					initialParametersReasoning: 'Test',
					initialParameters: {}
				});

				const http = await tools.addNode({
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeVersion: 1,
					name: 'HTTP Request',
					initialParametersReasoning: 'Test',
					initialParameters: {}
				});

				// Connect using result objects directly (ergonomic API)
				const connResult = await tools.connectNodes({
					sourceNodeId: trigger,
					targetNodeId: http
				});

				console.log('trigger nodeId:', trigger.nodeId);
				console.log('http nodeId:', http.nodeId);
				console.log('Connection result:', JSON.stringify(connResult));
				`,
				{ workflow: mockWorkflow, tools },
				() => operations,
			);

			expect(result.success).toBe(true);
			expect(tools.addNode).toHaveBeenCalledTimes(2);
			expect(tools.connectNodes).toHaveBeenCalledTimes(1);

			// Verify the AddNodeResult objects were passed through
			const connectCall = connectNodesCalls[0] as {
				sourceNodeId: unknown;
				targetNodeId: unknown;
			};
			expect(connectCall.sourceNodeId).toEqual({
				success: true,
				nodeId: 'trigger-id-123',
				nodeName: 'Trigger',
				nodeType: 'n8n-nodes-base.manualTrigger',
			});
			expect(connectCall.targetNodeId).toEqual({
				success: true,
				nodeId: 'http-id-456',
				nodeName: 'HTTP Request',
				nodeType: 'n8n-nodes-base.httpRequest',
			});

			// Verify console output shows correct nodeIds
			expect(result.consoleOutput).toContain('[LOG] trigger nodeId: trigger-id-123');
			expect(result.consoleOutput).toContain('[LOG] http nodeId: http-id-456');
		});
	});

	describe('validateScriptSyntax', () => {
		it('should validate correct syntax', () => {
			const result = validateScriptSyntax(`
				const x = 1;
				const y = { name: 'test' };
				console.log(x, y);
			`);

			expect(result.valid).toBe(true);
		});

		it('should allow top-level await in scripts', () => {
			// Scripts are wrapped in async IIFE during execution, so await must be valid
			const result = validateScriptSyntax(`
				const node = await tools.addNode({
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeVersion: 1,
					name: 'Test',
					initialParametersReasoning: 'Test',
					initialParameters: {}
				});
				await tools.connectNodes({
					sourceNodeId: node,
					targetNodeId: 'other-node'
				});
			`);

			expect(result.valid).toBe(true);
		});

		it('should detect syntax errors', () => {
			const result = validateScriptSyntax(`
				const x = {;
			`);

			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should detect unclosed brackets', () => {
			const result = validateScriptSyntax(`
				const arr = [1, 2, 3
			`);

			expect(result.valid).toBe(false);
		});
	});
});
