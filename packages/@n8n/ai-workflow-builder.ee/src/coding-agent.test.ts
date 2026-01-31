import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { CodingAgent, type CodingAgentConfig } from './coding-agent';

// Create a mock LLM
const createMockLLM = (responseContent: string, toolCalls: unknown[] = []) => {
	const mockResponse = {
		content: responseContent,
		tool_calls: toolCalls,
		response_metadata: { usage: { input_tokens: 100, output_tokens: 50 } },
	};

	return {
		invoke: jest.fn().mockResolvedValue(mockResponse),
		bindTools: jest.fn().mockReturnValue({
			invoke: jest.fn().mockResolvedValue(mockResponse),
		}),
	};
};

// Sample valid workflow code that should pass parsing
const validWorkflowCode = `
\`\`\`typescript
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
});

return workflow('test-id', 'Test Workflow')
  .add(startTrigger);
\`\`\`
`;

// Sample plan for testing
const samplePlan = `## Overview
Simple test workflow.

## Nodes
- **Start** (nodeType: \`n8n-nodes-base.manualTrigger\`)
  - Purpose: Manual trigger

## Flow
Start

## Key Points
- Simple workflow`;

describe('CodingAgent', () => {
	describe('constructor', () => {
		it('should initialize with required config', () => {
			const config: CodingAgentConfig = {
				llm: createMockLLM('') as unknown as CodingAgentConfig['llm'],
			};

			const agent = new CodingAgent(config);
			expect(agent).toBeInstanceOf(CodingAgent);
		});

		it('should accept optional logger', () => {
			const mockLogger = {
				debug: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
			};

			const config: CodingAgentConfig = {
				llm: createMockLLM('') as unknown as CodingAgentConfig['llm'],
				logger: mockLogger as unknown as CodingAgentConfig['logger'],
			};

			const agent = new CodingAgent(config);
			expect(agent).toBeInstanceOf(CodingAgent);
		});

		it('should accept optional generatedTypesDir', () => {
			const config: CodingAgentConfig = {
				llm: createMockLLM('') as unknown as CodingAgentConfig['llm'],
				generatedTypesDir: '/path/to/types',
			};

			const agent = new CodingAgent(config);
			expect(agent).toBeInstanceOf(CodingAgent);
		});
	});

	describe('run', () => {
		it('should yield stream output for valid workflow code', async () => {
			const config: CodingAgentConfig = {
				llm: createMockLLM(validWorkflowCode) as unknown as CodingAgentConfig['llm'],
			};

			const agent = new CodingAgent(config);
			const generator = agent.run(samplePlan);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should have message and workflow update chunks
			expect(chunks.length).toBeGreaterThan(0);

			// Should have a workflow-updated chunk
			const workflowChunk = chunks.find((c) =>
				c.messages?.some((m) => m.type === 'workflow-updated'),
			);
			expect(workflowChunk).toBeDefined();
		});

		it('should yield tool progress chunks when get_nodes is called', async () => {
			// First response calls tool, second returns code
			const toolCallResponse = {
				content: '',
				tool_calls: [
					{
						id: 'call-1',
						name: 'get_nodes',
						args: { nodeIds: ['n8n-nodes-base.manualTrigger'] },
					},
				],
				response_metadata: { usage: { input_tokens: 100, output_tokens: 50 } },
			};

			const codeResponse = {
				content: validWorkflowCode,
				tool_calls: [],
				response_metadata: { usage: { input_tokens: 100, output_tokens: 50 } },
			};

			const mockLLM = {
				invoke: jest.fn(),
				bindTools: jest.fn().mockReturnValue({
					invoke: jest
						.fn()
						.mockResolvedValueOnce(toolCallResponse)
						.mockResolvedValueOnce(codeResponse),
				}),
			};

			const config: CodingAgentConfig = {
				llm: mockLLM as unknown as CodingAgentConfig['llm'],
			};

			const agent = new CodingAgent(config);
			const generator = agent.run(samplePlan);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should have tool progress chunks
			const toolChunks = chunks.filter((c) => c.messages?.some((m) => m.type === 'tool'));
			expect(toolChunks.length).toBeGreaterThan(0);
		});

		it('should include current workflow context when provided', async () => {
			const currentWorkflow: WorkflowJSON = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1.1,
						position: [240, 300],
						parameters: {},
					},
				],
				connections: {},
			};

			const config: CodingAgentConfig = {
				llm: createMockLLM(validWorkflowCode) as unknown as CodingAgentConfig['llm'],
			};

			const agent = new CodingAgent(config);
			const generator = agent.run(samplePlan, currentWorkflow);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			expect(chunks.length).toBeGreaterThan(0);
		});

		it('should respect abort signal', async () => {
			const controller = new AbortController();
			controller.abort();

			const config: CodingAgentConfig = {
				llm: createMockLLM('') as unknown as CodingAgentConfig['llm'],
			};

			const agent = new CodingAgent(config);
			const generator = agent.run(samplePlan, undefined, controller.signal);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should have an error message chunk
			const errorChunk = chunks.find((c) =>
				c.messages?.some((m) => m.type === 'message' && 'text' in m && m.text.includes('error')),
			);
			expect(errorChunk).toBeDefined();
		});

		it('should handle invalid code and request correction', async () => {
			// First response has invalid code, second has valid code
			const invalidCodeResponse = {
				content: '```typescript\ninvalid code here\n```',
				tool_calls: [],
				response_metadata: { usage: { input_tokens: 100, output_tokens: 50 } },
			};

			const validCodeResponse = {
				content: validWorkflowCode,
				tool_calls: [],
				response_metadata: { usage: { input_tokens: 100, output_tokens: 50 } },
			};

			const mockLLM = {
				invoke: jest.fn(),
				bindTools: jest.fn().mockReturnValue({
					invoke: jest
						.fn()
						.mockResolvedValueOnce(invalidCodeResponse)
						.mockResolvedValueOnce(validCodeResponse),
				}),
			};

			const config: CodingAgentConfig = {
				llm: mockLLM as unknown as CodingAgentConfig['llm'],
			};

			const agent = new CodingAgent(config);
			const generator = agent.run(samplePlan);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should eventually yield a workflow-updated chunk
			const workflowChunk = chunks.find((c) =>
				c.messages?.some((m) => m.type === 'workflow-updated'),
			);
			expect(workflowChunk).toBeDefined();
		});

		it('should track token usage in workflow update chunk', async () => {
			const config: CodingAgentConfig = {
				llm: createMockLLM(validWorkflowCode) as unknown as CodingAgentConfig['llm'],
			};

			const agent = new CodingAgent(config);
			const generator = agent.run(samplePlan);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Find the workflow-updated chunk
			const workflowChunk = chunks.find((c) =>
				c.messages?.some((m) => m.type === 'workflow-updated'),
			);

			expect(workflowChunk).toBeDefined();

			const workflowMessage = workflowChunk?.messages?.find((m) => m.type === 'workflow-updated');
			if (workflowMessage && 'tokenUsage' in workflowMessage) {
				expect(workflowMessage.tokenUsage).toHaveProperty('inputTokens');
				expect(workflowMessage.tokenUsage).toHaveProperty('outputTokens');
			}
		});

		it('should include source code in workflow update chunk', async () => {
			const config: CodingAgentConfig = {
				llm: createMockLLM(validWorkflowCode) as unknown as CodingAgentConfig['llm'],
			};

			const agent = new CodingAgent(config);
			const generator = agent.run(samplePlan);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Find the workflow-updated chunk
			const workflowChunk = chunks.find((c) =>
				c.messages?.some((m) => m.type === 'workflow-updated'),
			);

			const workflowMessage = workflowChunk?.messages?.find((m) => m.type === 'workflow-updated');
			if (workflowMessage && 'sourceCode' in workflowMessage) {
				expect(workflowMessage.sourceCode).toContain('trigger');
				expect(workflowMessage.sourceCode).toContain('workflow');
			}
		});
	});
});
