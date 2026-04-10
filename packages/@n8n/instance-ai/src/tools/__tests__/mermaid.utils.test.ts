import type { TemplateConnections, TemplateNode } from '../templates/types';
import { mermaidStringify } from '../utils/mermaid.utils';

describe('mermaidStringify', () => {
	function makeNode(
		name: string,
		type: string,
		position: [number, number] = [0, 0],
		parameters: Record<string, unknown> = {},
		typeVersion = 1,
		id?: string,
	): TemplateNode {
		return { name, type, typeVersion, position, parameters, id };
	}

	it('should generate a simple linear workflow diagram', () => {
		const nodes: TemplateNode[] = [
			makeNode('Trigger', 'n8n-nodes-base.scheduleTrigger', [0, 0]),
			makeNode('HTTP Request', 'n8n-nodes-base.httpRequest', [200, 0]),
			makeNode('Set', 'n8n-nodes-base.set', [400, 0]),
		];

		const connections: TemplateConnections = {
			Trigger: { main: [[{ node: 'HTTP Request' }]] },
			'HTTP Request': { main: [[{ node: 'Set' }]] },
		};

		const result = mermaidStringify({ workflow: { nodes, connections } });

		expect(result).toContain('```mermaid');
		expect(result).toContain('flowchart TD');
		expect(result).toContain('```');
		expect(result).toContain('Trigger');
		expect(result).toContain('HTTP Request');
		expect(result).toContain('Set');
		expect(result).toContain('-->');
	});

	it('should render conditional nodes as diamonds', () => {
		const nodes: TemplateNode[] = [
			makeNode('Trigger', 'n8n-nodes-base.scheduleTrigger', [0, 0]),
			makeNode('Check', 'n8n-nodes-base.if', [200, 0]),
		];

		const connections: TemplateConnections = {
			Trigger: { main: [[{ node: 'Check' }]] },
		};

		const result = mermaidStringify({ workflow: { nodes, connections } });

		// Diamond shape uses curly braces
		expect(result).toMatch(/n\d+\{"Check"\}/);
	});

	it('should skip sticky note nodes from main diagram', () => {
		const nodes: TemplateNode[] = [
			makeNode('Trigger', 'n8n-nodes-base.scheduleTrigger', [0, 0]),
			makeNode('Sticky Note', 'n8n-nodes-base.stickyNote', [500, 500], {
				content: 'This is a note',
				width: 150,
				height: 80,
			}),
		];

		const connections: TemplateConnections = {};

		const result = mermaidStringify({ workflow: { nodes, connections } });

		// Sticky should appear as comment, not as a node
		expect(result).toContain('%% This is a note');
		expect(result).not.toContain('Sticky Note');
	});

	it('should include node parameters when includeNodeParameters is true', () => {
		const nodes: TemplateNode[] = [
			makeNode('HTTP Request', 'n8n-nodes-base.httpRequest', [0, 0], {
				url: 'https://example.com',
				method: 'GET',
			}),
		];

		const connections: TemplateConnections = {};

		const resultWith = mermaidStringify(
			{ workflow: { nodes, connections } },
			{ includeNodeParameters: true },
		);
		expect(resultWith).toContain('https://example.com');

		const resultWithout = mermaidStringify(
			{ workflow: { nodes, connections } },
			{ includeNodeParameters: false },
		);
		expect(resultWithout).not.toContain('https://example.com');
	});

	it('should include node type with resource and operation in comment', () => {
		const nodes: TemplateNode[] = [
			makeNode('Slack', 'n8n-nodes-base.slack', [0, 0], {
				resource: 'message',
				operation: 'send',
			}),
		];

		const connections: TemplateConnections = {};

		const result = mermaidStringify({ workflow: { nodes, connections } });

		expect(result).toContain('n8n-nodes-base.slack:message:send');
	});

	it('should handle agent nodes with AI subgraphs', () => {
		const nodes: TemplateNode[] = [
			makeNode('Chat Trigger', 'n8n-nodes-base.chatTrigger', [0, 0]),
			makeNode('Agent', '@n8n/n8n-nodes-langchain.agent', [200, 0]),
			makeNode('OpenAI', '@n8n/n8n-nodes-langchain.lmChatOpenAi', [200, -200]),
		];

		const connections: TemplateConnections = {
			'Chat Trigger': { main: [[{ node: 'Agent' }]] },
			OpenAI: { ai_languageModel: [[{ node: 'Agent' }]] },
		};

		const result = mermaidStringify({ workflow: { nodes, connections } });

		expect(result).toContain('subgraph');
		expect(result).toContain('end');
		expect(result).toContain('ai_languageModel');
	});

	it('should accept WorkflowMetadata input format', () => {
		const input = {
			templateId: 123,
			name: 'Test Template',
			description: 'A test',
			workflow: {
				name: 'Test',
				nodes: [makeNode('Trigger', 'n8n-nodes-base.scheduleTrigger', [0, 0])],
				connections: {} as TemplateConnections,
			},
		};

		const result = mermaidStringify(input);

		expect(result).toContain('```mermaid');
		expect(result).toContain('Trigger');
	});

	it('should handle workflow with no connections', () => {
		const nodes: TemplateNode[] = [
			makeNode('Node A', 'n8n-nodes-base.set', [0, 0]),
			makeNode('Node B', 'n8n-nodes-base.code', [200, 0]),
		];

		const connections: TemplateConnections = {};

		const result = mermaidStringify({ workflow: { nodes, connections } });

		expect(result).toContain('```mermaid');
		expect(result).toContain('Node A');
		expect(result).toContain('Node B');
	});

	it('should include node ID in comments when includeNodeId is true', () => {
		const nodes: TemplateNode[] = [
			makeNode('My Node', 'n8n-nodes-base.set', [0, 0], {}, 1, 'abc-123'),
		];

		const connections: TemplateConnections = {};

		const result = mermaidStringify({ workflow: { nodes, connections } }, { includeNodeId: true });

		expect(result).toContain('[abc-123]');
	});
});
