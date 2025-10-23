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
					},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(1);
		expect(result.violations[0]).toEqual({
			type: 'minor',
			description:
				'Agent node "AI Agent" has no expression in its prompt field. This likely means it failed to use chatInput',
			pointsDeducted: 15,
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
					},
				},
			],
			connections: {},
		});

		const result = evaluateAgentPrompt(workflow);

		expect(result.violations).toHaveLength(1);
		expect(result.violations[0].pointsDeducted).toBe(15);
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

		expect(result.violations).toHaveLength(1);
		expect(result.violations[0].type).toBe('minor');
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
});
