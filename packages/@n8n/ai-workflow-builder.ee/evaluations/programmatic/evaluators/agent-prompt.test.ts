import { mock } from 'jest-mock-extended';

import type { SimpleWorkflow } from '@/types';

import { evaluateAgentPrompt } from './agent-prompt';

describe('evaluateAgentPrompt', () => {
	it('should return no violations for empty workflow', () => {
		const workflow = mock<SimpleWorkflow>({
			nodes: [],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(0);
	});

	it('should return no violations for workflow without agent nodes', () => {
		const workflow = mock<SimpleWorkflow>({
			nodes: [
				{
					id: '1',
					name: 'Chat Trigger',
					type: 'n8n-nodes-base.chatTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'Code Node',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [100, 0],
					parameters: {},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(0);
	});

	it('should return violation for agent node without expression in prompt', () => {
		const workflow = mock<SimpleWorkflow>({
			nodes: [
				{
					id: '1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						text: 'This is a static prompt without expressions',
						options: {
							systemMessage: 'You are a helpful agent.',
						},
					},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(1);
		expect(result.violations[0]).toEqual({
			type: 'major',
			name: expect.any(String),
			description:
				'Agent node "AI Agent" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context',
			pointsDeducted: 20,
		});
	});

	it('should return no violations for agent node with expression in prompt', () => {
		const workflow = mock<SimpleWorkflow>({
			nodes: [
				{
					id: '1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						text: '=Process this request: {{ $json.chatInput }}',
						options: {
							systemMessage: 'You are a helpful agent.',
						},
					},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(0);
	});

	it('should handle different expression formats', () => {
		const workflow = mock<SimpleWorkflow>({
			nodes: [
				{
					id: '1',
					name: 'Agent 1',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						text: '=Process: {{ $json.input }}',
						options: {
							systemMessage: 'You are a helpful agent.',
						},
					},
				},
				{
					id: '2',
					name: 'Agent 2',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [100, 0],
					parameters: {
						text: "=Process: {{$('Chat Trigger'.params.chatInput)}}",
						options: {
							systemMessage: 'You are a helpful agent.',
						},
					},
				},
				{
					id: '3',
					name: 'Agent 3',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [200, 0],
					parameters: {
						text: '={{ $json.chatInput }}',
						options: {
							systemMessage: 'You are a helpful agent.',
						},
					},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(0);
	});

	it('should not check agent nodes with promptType set to auto', () => {
		const workflow = mock<SimpleWorkflow>({
			nodes: [
				{
					id: '1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						promptType: 'auto',
						text: 'This would normally trigger a violation',
					},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(0);
	});
	it('should not check agent nodes with promptType set to guardrails', () => {
		const workflow = mock<SimpleWorkflow>({
			nodes: [
				{
					id: '1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						promptType: 'guardrails',
						text: 'This would normally trigger a violation',
					},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(0);
	});

	it('should not check agent nodes with promptType set to guardrails', () => {
		const workflow = mock<SimpleWorkflow>({
			nodes: [
				{
					id: '1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						promptType: 'guardrails',
						text: 'This would normally trigger a violation',
					},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(0);
	});

	it('should check agent nodes with promptType set to define', () => {
		const workflow = mock<SimpleWorkflow>({
			nodes: [
				{
					id: '1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						promptType: 'define',
						text: 'Static text without expressions',
						options: {
							systemMessage: 'You are a helpful agent.',
						},
					},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(1);
		expect(result.violations[0].pointsDeducted).toBe(20);
	});

	it('should handle missing parameters gracefully', () => {
		const workflow = mock<SimpleWorkflow>({
			nodes: [
				{
					id: '1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		// Should have violations for: no expression + no systemMessage
		expect(result.violations.length).toBeGreaterThanOrEqual(1);
		expect(result.violations.some((v) => v.type === 'major')).toBe(true);
	});

	it('should detect multiple agents with issues', () => {
		const workflow = mock<SimpleWorkflow>({
			nodes: [
				{
					id: '1',
					name: 'Agent 1',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						text: 'No expression here',
						options: {
							systemMessage: 'You are a helpful agent.',
						},
					},
				},
				{
					id: '2',
					name: 'Agent 2',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [100, 0],
					parameters: {
						text: 'Also no expression',
						options: {
							systemMessage: 'You are a helpful agent.',
						},
					},
				},
				{
					id: '3',
					name: 'Agent 3',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2,
					position: [200, 0],
					parameters: {
						text: '=Has expression: {{ $json.input }}',
						options: {
							systemMessage: 'You are a helpful agent.',
						},
					},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(2);
		expect(result.violations[0].description).toContain('Agent 1');
		expect(result.violations[1].description).toContain('Agent 2');
	});

	describe('System Message Separation', () => {
		it('should flag agent with no systemMessage as major violation', () => {
			const workflow = mock<SimpleWorkflow>({
				nodes: [
					{
						id: '1',
						name: 'Orchestrator Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 3,
						position: [0, 0],
						parameters: {
							promptType: 'define',
							text: '=You are an orchestrator agent that coordinates specialized agents. Your task is to: 1) Call Research Agent 2) Call Fact-Check Agent. The research topic is: {{ $json.researchTopic }}',
						},
					},
				],
				connections: {},
			});

			const result = evaluateAgentPrompt(workflow);

			// Should have major violation for missing systemMessage
			expect(result.violations.length).toBeGreaterThan(0);
			const systemMessageViolation = result.violations.find((v) =>
				v.description.includes('no system message'),
			);
			expect(systemMessageViolation).toBeDefined();
			expect(systemMessageViolation?.type).toBe('major');
			expect(systemMessageViolation?.pointsDeducted).toBe(25);
		});

		it('should not flag agent when it has proper systemMessage', () => {
			const workflow = mock<SimpleWorkflow>({
				nodes: [
					{
						id: '1',
						name: 'Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 3,
						position: [0, 0],
						parameters: {
							promptType: 'define',
							text: '=You are an agent. Your task is to process: {{ $json.data }}',
							options: {
								systemMessage: 'You are a helpful agent.',
							},
						},
					},
				],
				connections: {},
			});

			const result = evaluateAgentPrompt(workflow);

			// Should not have any system message violations
			const systemMessageViolations = result.violations.filter((v) =>
				v.description.includes('system message'),
			);
			expect(systemMessageViolations).toHaveLength(0);
		});

		it('should pass for properly separated agent configuration', () => {
			const workflow = mock<SimpleWorkflow>({
				nodes: [
					{
						id: '1',
						name: 'Orchestrator Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 3,
						position: [0, 0],
						parameters: {
							promptType: 'define',
							text: '=The research topic is: {{ $json.researchTopic }}',
							options: {
								systemMessage:
									'You are an orchestrator agent that coordinates specialized agents.\n\nYour task is to:\n1. Call the Research Agent Tool\n2. Call the Fact-Check Agent Tool\n3. Generate a report',
							},
						},
					},
				],
				connections: {},
			});

			const result = evaluateAgentPrompt(workflow);

			// Should have no violations
			expect(result.violations).toHaveLength(0);
		});

		it('should handle agents with expressions in text and proper systemMessage', () => {
			const testCases = [
				{ text: "=You're analyzing: {{ $json.input }}" }, // Contains "you're" but has systemMessage
				{ text: '=Process this data: {{ $json.data }}' },
				{ text: '=User question: {{ $json.chatInput }}' },
				{ text: '=Analyze for topic: {{ $json.researchTopic }}' },
			];

			testCases.forEach(({ text }, index) => {
				const workflow = mock<SimpleWorkflow>({
					nodes: [
						{
							id: `test-${index}`,
							name: `Test Agent ${index}`,
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 3,
							position: [0, 0],
							parameters: {
								promptType: 'define',
								text,
								options: {
									systemMessage: 'You are a helpful assistant.',
								},
							},
						},
					],
					connections: {},
				});

				const result = evaluateAgentPrompt(workflow);
				// Should have no violations since systemMessage is present
				expect(result.violations).toHaveLength(0);
			});
		});

		it('should flag major violation when agent has no systemMessage', () => {
			const workflow = mock<SimpleWorkflow>({
				nodes: [
					{
						id: '1',
						name: 'Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 3,
						position: [0, 0],
						parameters: {
							promptType: 'define',
							text: '=Process: {{ $json.input }}',
						},
					},
				],
				connections: {},
			});

			const result = evaluateAgentPrompt(workflow);

			const noSystemMessageViolation = result.violations.find((v) =>
				v.description.includes('no system message'),
			);
			expect(noSystemMessageViolation).toBeDefined();
			expect(noSystemMessageViolation?.type).toBe('major');
			expect(noSystemMessageViolation?.pointsDeducted).toBe(25);
		});
	});
});
