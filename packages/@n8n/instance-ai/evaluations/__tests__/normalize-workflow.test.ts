/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
// `SimpleWorkflow` (the return type of `normalizeWorkflow`) is imported from
// `ai-workflow-builder.ee` via deep relative paths into source files that use
// a `@/*` path alias. That alias collides with instance-ai's own `@/*` mapping
// when type-checked transitively, so the type resolves to `error` here even
// though the runtime behaviour is correct.
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { normalizeWorkflow, serializeNormalizedWorkflow } from '../harness/normalize-workflow';

// ---------------------------------------------------------------------------
// normalizeWorkflow
// ---------------------------------------------------------------------------

describe('normalizeWorkflow', () => {
	it('drops server-assigned and transient fields from the top level', () => {
		const raw: WorkflowJSON = {
			id: 'wf-123',
			name: 'My Workflow',
			nodes: [],
			connections: {},
			settings: { executionOrder: 'v1' },
			pinData: { node1: [{ foo: 'bar' }] },
			meta: { instanceId: 'abc' },
		};

		const result = normalizeWorkflow(raw);

		expect(result).toEqual({
			name: 'My Workflow',
			nodes: [],
			connections: {},
		});
		expect(result).not.toHaveProperty('id');
		expect(result).not.toHaveProperty('settings');
		expect(result).not.toHaveProperty('pinData');
		expect(result).not.toHaveProperty('meta');
	});

	it('preserves node ordering and semantic fields', () => {
		const raw: WorkflowJSON = {
			name: 'Two-node workflow',
			nodes: [
				{
					id: 'n1',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'n2',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4,
					position: [200, 0],
					parameters: { url: 'https://example.com' },
					credentials: { httpBasicAuth: { id: 'cred1', name: 'auth' } },
				},
			],
			connections: {
				Trigger: {
					main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
				},
			},
		};

		const result = normalizeWorkflow(raw);

		expect(result.nodes).toHaveLength(2);
		expect(result.nodes[0].name).toBe('Trigger');
		expect(result.nodes[1].name).toBe('HTTP Request');
		expect(result.nodes[1].credentials).toEqual({
			httpBasicAuth: { id: 'cred1', name: 'auth' },
		});
		expect(result.connections).toEqual(raw.connections);
	});

	it('defaults missing parameters to an empty object so judges see stable shape', () => {
		const raw: WorkflowJSON = {
			name: 'No-param workflow',
			nodes: [
				{
					id: 'n1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
				},
			],
			connections: {},
		};

		const result = normalizeWorkflow(raw);

		expect(result.nodes[0].parameters).toEqual({});
	});

	it('falls back to node id when name is missing (sticky notes etc.)', () => {
		const raw: WorkflowJSON = {
			name: 'Sticky-note workflow',
			nodes: [
				{
					id: 'sticky-1',
					type: 'n8n-nodes-base.stickyNote',
					typeVersion: 1,
					position: [0, 0],
				},
			],
			connections: {},
		};

		const result = normalizeWorkflow(raw);

		expect(result.nodes[0].name).toBe('sticky-1');
	});
});

// ---------------------------------------------------------------------------
// serializeNormalizedWorkflow
// ---------------------------------------------------------------------------

describe('serializeNormalizedWorkflow', () => {
	it('produces byte-identical output regardless of key insertion order', () => {
		const a = normalizeWorkflow({
			name: 'Order test',
			nodes: [
				{
					id: 'n1',
					name: 'Node',
					type: 't',
					typeVersion: 1,
					position: [0, 0],
					parameters: { z: 1, a: 2 },
				},
			],
			connections: { Node: { main: [] } },
		});

		const b = normalizeWorkflow({
			connections: { Node: { main: [] } },
			name: 'Order test',
			nodes: [
				{
					position: [0, 0],
					typeVersion: 1,
					type: 't',
					name: 'Node',
					id: 'n1',
					parameters: { a: 2, z: 1 },
				},
			],
		});

		expect(serializeNormalizedWorkflow(a)).toBe(serializeNormalizedWorkflow(b));
	});
});
