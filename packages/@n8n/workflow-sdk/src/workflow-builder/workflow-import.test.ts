/**
 * Tests for workflow import utility
 */

import { parseWorkflowJSON } from './workflow-import';
import type { WorkflowJSON } from '../types/base';

describe('parseWorkflowJSON', () => {
	it('extracts id and name from JSON', () => {
		const json: WorkflowJSON = {
			id: 'test-id',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
		};

		const result = parseWorkflowJSON(json);

		expect(result.id).toBe('test-id');
		expect(result.name).toBe('Test Workflow');
	});

	it('defaults id to empty string when not provided', () => {
		const json = {
			name: 'Test Workflow',
			nodes: [],
			connections: {},
		} as WorkflowJSON;

		const result = parseWorkflowJSON(json);

		expect(result.id).toBe('');
	});

	it('creates node instances from JSON nodes', () => {
		const json: WorkflowJSON = {
			id: 'test-id',
			name: 'Test Workflow',
			nodes: [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4,
					position: [100, 200],
					parameters: { url: 'https://example.com' },
				},
			],
			connections: {},
		};

		const result = parseWorkflowJSON(json);

		expect(result.nodes.size).toBe(1);
		const node = result.nodes.get('HTTP Request');
		expect(node?.instance.type).toBe('n8n-nodes-base.httpRequest');
		expect(node?.instance.name).toBe('HTTP Request');
		expect(node?.instance.config?.parameters).toEqual({ url: 'https://example.com' });
	});

	it('converts typeVersion to version string format', () => {
		const json: WorkflowJSON = {
			id: 'test-id',
			name: 'Test Workflow',
			nodes: [
				{
					id: 'node-1',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		};

		const result = parseWorkflowJSON(json);
		const node = result.nodes.get('Set');

		expect(node?.instance.version).toBe('v3.4');
	});

	it('preserves credentials exactly including empty placeholders', () => {
		// Type assertion needed because empty credential placeholders ({}) are valid at runtime
		// but don't satisfy the strict WorkflowJSON type
		const json = {
			id: 'test-id',
			name: 'Test Workflow',
			nodes: [
				{
					id: 'node-1',
					name: 'OpenAI',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
					credentials: {
						openAiApi: {},
					},
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;

		const result = parseWorkflowJSON(json);
		const node = result.nodes.get('OpenAI');

		expect(node?.instance.config?.credentials).toEqual({ openAiApi: {} });
	});

	it('rebuilds connections from JSON', () => {
		const json: WorkflowJSON = {
			id: 'test-id',
			name: 'Test Workflow',
			nodes: [
				{
					id: 'node-1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'node-2',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3,
					position: [200, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		};

		const result = parseWorkflowJSON(json);
		const triggerNode = result.nodes.get('Trigger');
		const mainConns = triggerNode?.connections.get('main');

		expect(mainConns?.get(0)).toContainEqual({
			node: 'Set',
			type: 'main',
			index: 0,
		});
	});

	it('handles nodes without names using id as name', () => {
		const json: WorkflowJSON = {
			id: 'test-id',
			name: 'Test Workflow',
			nodes: [
				{
					id: 'sticky-1',
					type: 'n8n-nodes-base.stickyNote',
					typeVersion: 1,
					position: [0, 0],
					parameters: { content: 'Hello' },
				} as WorkflowJSON['nodes'][0],
			],
			connections: {},
		};

		const result = parseWorkflowJSON(json);

		expect(result.nodes.size).toBe(1);
		const node = result.nodes.get('sticky-1');
		expect(node?.instance.name).toBe('sticky-1');
	});

	it('preserves settings from JSON', () => {
		const json: WorkflowJSON = {
			id: 'test-id',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			settings: { timezone: 'UTC', executionOrder: 'v1' },
		};

		const result = parseWorkflowJSON(json);

		expect(result.settings).toEqual({ timezone: 'UTC', executionOrder: 'v1' });
	});

	it('preserves pinData from JSON', () => {
		const json: WorkflowJSON = {
			id: 'test-id',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			pinData: {
				Set: [{ data: 'test' }],
			},
		};

		const result = parseWorkflowJSON(json);

		expect(result.pinData).toEqual({ Set: [{ data: 'test' }] });
	});

	it('preserves meta from JSON', () => {
		const json: WorkflowJSON = {
			id: 'test-id',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			meta: {
				templateId: 'template-123',
				instanceId: 'instance-456',
			},
		};

		const result = parseWorkflowJSON(json);

		expect(result.meta).toEqual({
			templateId: 'template-123',
			instanceId: 'instance-456',
		});
	});

	it('sets lastNode to the last node key', () => {
		const json: WorkflowJSON = {
			id: 'test-id',
			name: 'Test Workflow',
			nodes: [
				{
					id: 'node-1',
					name: 'First',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'node-2',
					name: 'Second',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
			],
			connections: {},
		};

		const result = parseWorkflowJSON(json);

		expect(result.lastNode).toBe('Second');
	});

	it('returns null for lastNode when no nodes', () => {
		const json: WorkflowJSON = {
			id: 'test-id',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
		};

		const result = parseWorkflowJSON(json);

		expect(result.lastNode).toBeNull();
	});
});
