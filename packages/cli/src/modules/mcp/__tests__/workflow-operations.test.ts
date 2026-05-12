import type { IConnections, INode } from 'n8n-workflow';

import {
	applyOperations,
	partialUpdateOperationSchema,
	type PartialUpdateOperation,
} from '../tools/workflow-builder/workflow-operations';

const makeNode = (overrides: Partial<INode> = {}): INode => ({
	id: 'node-id',
	name: 'A',
	type: 'n8n-nodes-base.set',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

const baseWorkflow = () => ({
	name: 'wf',
	description: 'd',
	nodes: [
		makeNode({ id: 'a', name: 'A', position: [0, 0] }),
		makeNode({ id: 'b', name: 'B', position: [200, 0], parameters: { url: 'https://old' } }),
	],
	connections: {
		A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
	} as IConnections,
});

describe('applyOperations', () => {
	describe('updateNodeParameters', () => {
		test('deep-merges by default', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes.find((n) => n.name === 'B')!.parameters).toEqual({
				url: 'https://new',
			});
		});

		test('preserves untouched parameter keys when merging', () => {
			const wf = baseWorkflow();
			wf.nodes[1].parameters = { url: 'https://old', method: 'GET' };
			const ops: PartialUpdateOperation[] = [
				{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes.find((n) => n.name === 'B')!.parameters).toEqual({
				url: 'https://new',
				method: 'GET',
			});
		});

		test('replace=true overwrites parameters', () => {
			const ops: PartialUpdateOperation[] = [
				{
					type: 'updateNodeParameters',
					nodeName: 'B',
					parameters: { method: 'POST' },
					replace: true,
				},
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes.find((n) => n.name === 'B')!.parameters).toEqual({
				method: 'POST',
			});
		});

		test('rejects when node does not exist', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'updateNodeParameters', nodeName: 'Missing', parameters: { x: 1 } },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("node 'Missing' not found");
			expect(result.opIndex).toBe(0);
		});

		test('does not mutate input on success', () => {
			const wf = baseWorkflow();
			const before = JSON.stringify(wf);
			applyOperations(wf, [
				{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
			]);
			expect(JSON.stringify(wf)).toBe(before);
		});
	});

	describe('setNodeParameter', () => {
		test('sets a top-level parameter via JSON Pointer', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'setNodeParameter', nodeName: 'B', path: '/url', value: 'https://new' },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes.find((n) => n.name === 'B')!.parameters).toEqual({
				url: 'https://new',
			});
		});

		test('preserves sibling keys at the leaf', () => {
			const wf = baseWorkflow();
			wf.nodes[1].parameters = { url: 'https://old', method: 'GET' };
			const ops: PartialUpdateOperation[] = [
				{ type: 'setNodeParameter', nodeName: 'B', path: '/method', value: 'POST' },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes.find((n) => n.name === 'B')!.parameters).toEqual({
				url: 'https://old',
				method: 'POST',
			});
		});

		test('creates intermediate objects on demand for a deep path', () => {
			const ops: PartialUpdateOperation[] = [
				{
					type: 'setNodeParameter',
					nodeName: 'B',
					path: '/options/systemMessage',
					value: 'You are a helpful assistant',
				},
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			const params = result.workflow.nodes.find((n) => n.name === 'B')!.parameters as {
				url: string;
				options: { systemMessage: string };
			};
			expect(params.url).toBe('https://old');
			expect(params.options.systemMessage).toBe('You are a helpful assistant');
		});

		test('descends into existing nested objects without clobbering siblings', () => {
			const wf = baseWorkflow();
			wf.nodes[1].parameters = { options: { mode: 'manual', timeout: 30 } };
			const ops: PartialUpdateOperation[] = [
				{ type: 'setNodeParameter', nodeName: 'B', path: '/options/timeout', value: 60 },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes.find((n) => n.name === 'B')!.parameters).toEqual({
				options: { mode: 'manual', timeout: 60 },
			});
		});

		test('accepts non-string values', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'setNodeParameter', nodeName: 'B', path: '/retries', value: 3 },
				{ type: 'setNodeParameter', nodeName: 'B', path: '/disabled', value: false },
				{ type: 'setNodeParameter', nodeName: 'B', path: '/headers', value: { 'x-id': '1' } },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			const params = result.workflow.nodes.find((n) => n.name === 'B')!.parameters;
			expect(params).toMatchObject({
				retries: 3,
				disabled: false,
				headers: { 'x-id': '1' },
			});
		});

		test('decodes ~1 and ~0 escapes in path segments', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'setNodeParameter', nodeName: 'B', path: '/a~1b', value: 1 },
				{ type: 'setNodeParameter', nodeName: 'B', path: '/c~0d', value: 2 },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			const params = result.workflow.nodes.find((n) => n.name === 'B')!.parameters as Record<
				string,
				unknown
			>;
			expect(params['a/b']).toBe(1);
			expect(params['c~d']).toBe(2);
		});

		test('rejects when node does not exist', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'setNodeParameter', nodeName: 'Missing', path: '/x', value: 1 },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(false);
		});

		test('rejects path that does not start with /', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'setNodeParameter', nodeName: 'B', path: 'url', value: 'x' },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(false);
		});

		test('rejects unsafe segment in path', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'setNodeParameter', nodeName: 'B', path: '/__proto__/polluted', value: true },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(false);
			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		});

		test('sanitizes unsafe keys inside the value', () => {
			const ops: PartialUpdateOperation[] = [
				{
					type: 'setNodeParameter',
					nodeName: 'B',
					path: '/options',
					value: { __proto__: { polluted: true }, mode: 'manual' },
				},
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			const options = (
				result.workflow.nodes.find((n) => n.name === 'B')!.parameters as {
					options: Record<string, unknown>;
				}
			).options;
			expect(options.mode).toBe('manual');
			expect(Object.prototype.hasOwnProperty.call(options, '__proto__')).toBe(false);
			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		});

		test('rejects descent through a non-object intermediate', () => {
			const wf = baseWorkflow();
			wf.nodes[1].parameters = { options: 'not-an-object' };
			const ops: PartialUpdateOperation[] = [
				{ type: 'setNodeParameter', nodeName: 'B', path: '/options/mode', value: 'manual' },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain('cannot descend');
		});

		test('rejects descent through a null intermediate (does not silently overwrite)', () => {
			const wf = baseWorkflow();
			wf.nodes[1].parameters = { options: null };
			const ops: PartialUpdateOperation[] = [
				{ type: 'setNodeParameter', nodeName: 'B', path: '/options/mode', value: 'manual' },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain('cannot descend');
			expect(wf.nodes[1].parameters).toEqual({ options: null });
		});

		test('does not mutate input on success', () => {
			const wf = baseWorkflow();
			const before = JSON.stringify(wf);
			applyOperations(wf, [
				{ type: 'setNodeParameter', nodeName: 'B', path: '/url', value: 'https://new' },
			]);
			expect(JSON.stringify(wf)).toBe(before);
		});

		test('schema rejects an omitted (undefined) value', () => {
			const parsed = partialUpdateOperationSchema.safeParse({
				type: 'setNodeParameter',
				nodeName: 'B',
				path: '/url',
			});
			expect(parsed.success).toBe(false);
		});

		test('rejects paths with empty segments', () => {
			for (const path of ['/foo//bar', '/foo/', '//bar']) {
				const result = applyOperations(baseWorkflow(), [
					{ type: 'setNodeParameter', nodeName: 'B', path, value: 1 },
				]);
				expect(result.success).toBe(false);
				if (result.success) continue;
				expect(result.error).toContain('invalid');
			}
		});

		test('rejects paths with invalid ~ escape sequences', () => {
			for (const path of ['/foo~2bar', '/foo~', '/~', '/foo/bar~']) {
				const result = applyOperations(baseWorkflow(), [
					{ type: 'setNodeParameter', nodeName: 'B', path, value: 1 },
				]);
				expect(result.success).toBe(false);
				if (result.success) continue;
				expect(result.error).toContain('invalid');
			}
		});

		test('fails clearly when descending through an array (indices not supported)', () => {
			const wf = baseWorkflow();
			wf.nodes[1].parameters = { values: [{ name: 'Content-Type', value: 'application/json' }] };
			const result = applyOperations(wf, [
				{ type: 'setNodeParameter', nodeName: 'B', path: '/values/0/value', value: 'text/plain' },
			]);
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain('cannot descend');
		});
	});

	describe('addNode', () => {
		test('appends a new node and tracks it as added', () => {
			const ops: PartialUpdateOperation[] = [
				{
					type: 'addNode',
					node: {
						name: 'C',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						parameters: { value: 1 },
					},
				},
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes).toHaveLength(3);
			expect(result.workflow.nodes[2].name).toBe('C');
			expect(result.workflow.nodes[2].id).toBeTruthy();
			expect(result.addedNodeNames).toEqual(['C']);
		});

		test('uses provided position and id', () => {
			const ops: PartialUpdateOperation[] = [
				{
					type: 'addNode',
					node: {
						id: 'fixed-id',
						name: 'C',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [400, 100],
					},
				},
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			const c = result.workflow.nodes.find((n) => n.name === 'C')!;
			expect(c.id).toBe('fixed-id');
			expect(c.position).toEqual([400, 100]);
		});

		test('rejects when name already exists', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'addNode', node: { name: 'A', type: 'n8n-nodes-base.set', typeVersion: 1 } },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("a node named 'A' already exists");
		});
	});

	describe('removeNode', () => {
		test('removes node and prunes inbound + outbound connections', () => {
			const wf = baseWorkflow();
			wf.connections.B = { main: [[{ node: 'A', type: 'main', index: 0 }]] };
			const ops: PartialUpdateOperation[] = [{ type: 'removeNode', nodeName: 'B' }];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes).toHaveLength(1);
			expect(result.workflow.connections).toEqual({});
		});

		test('rejects when node does not exist', () => {
			const result = applyOperations(baseWorkflow(), [{ type: 'removeNode', nodeName: 'Nope' }]);
			expect(result.success).toBe(false);
		});

		test('untracks an added node when it is removed in the same batch', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'addNode', node: { name: 'C', type: 'n8n-nodes-base.set', typeVersion: 1 } },
				{ type: 'removeNode', nodeName: 'C' },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.addedNodeNames).toEqual([]);
		});
	});

	describe('renameNode', () => {
		test('renames node and rewrites connections both as source and target', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'renameNode', oldName: 'B', newName: 'BRenamed' },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes.find((n) => n.name === 'B')).toBeUndefined();
			expect(result.workflow.nodes.find((n) => n.name === 'BRenamed')).toBeDefined();
			expect(result.workflow.connections.A.main[0]![0].node).toBe('BRenamed');
		});

		test('renames source-key references too', () => {
			const wf = baseWorkflow();
			wf.connections.B = { main: [[{ node: 'A', type: 'main', index: 0 }]] };
			const ops: PartialUpdateOperation[] = [
				{ type: 'renameNode', oldName: 'B', newName: 'BRenamed' },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.connections.B).toBeUndefined();
			expect(result.workflow.connections.BRenamed).toEqual({
				main: [[{ node: 'A', type: 'main', index: 0 }]],
			});
		});

		test('no-op when oldName equals newName', () => {
			const result = applyOperations(baseWorkflow(), [
				{ type: 'renameNode', oldName: 'A', newName: 'A' },
			]);
			expect(result.success).toBe(true);
		});

		test('rejects when newName collides', () => {
			const result = applyOperations(baseWorkflow(), [
				{ type: 'renameNode', oldName: 'A', newName: 'B' },
			]);
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("a node named 'B' already exists");
		});

		test('rejects when oldName does not exist', () => {
			const result = applyOperations(baseWorkflow(), [
				{ type: 'renameNode', oldName: 'X', newName: 'Y' },
			]);
			expect(result.success).toBe(false);
		});
	});

	describe('addConnection', () => {
		test('adds a connection with default indices and main type', () => {
			const wf = baseWorkflow();
			wf.connections = {};
			const ops: PartialUpdateOperation[] = [{ type: 'addConnection', source: 'A', target: 'B' }];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.connections.A.main[0]).toEqual([
				{ node: 'B', type: 'main', index: 0 },
			]);
		});

		test('is idempotent — adding the same connection twice yields one entry', () => {
			const wf = baseWorkflow();
			wf.connections = {};
			const ops: PartialUpdateOperation[] = [
				{ type: 'addConnection', source: 'A', target: 'B' },
				{ type: 'addConnection', source: 'A', target: 'B' },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.connections.A.main[0]).toHaveLength(1);
		});

		test('pads earlier output indices with null when adding to a higher index', () => {
			const wf = baseWorkflow();
			wf.connections = {};
			const ops: PartialUpdateOperation[] = [
				{ type: 'addConnection', source: 'A', target: 'B', sourceIndex: 2 },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.connections.A.main).toEqual([
				null,
				null,
				[{ node: 'B', type: 'main', index: 0 }],
			]);
		});

		test('rejects when source node is missing', () => {
			const result = applyOperations(baseWorkflow(), [
				{ type: 'addConnection', source: 'Missing', target: 'B' },
			]);
			expect(result.success).toBe(false);
		});

		test('rejects when target node is missing', () => {
			const result = applyOperations(baseWorkflow(), [
				{ type: 'addConnection', source: 'A', target: 'Missing' },
			]);
			expect(result.success).toBe(false);
		});
	});

	describe('removeConnection', () => {
		test('removes the matching connection and prunes empty shapes', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'removeConnection', source: 'A', target: 'B' },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.connections).toEqual({});
		});

		test('rejects when no such connection exists', () => {
			const ops: PartialUpdateOperation[] = [
				{ type: 'removeConnection', source: 'A', target: 'B', sourceIndex: 5 },
			];
			const result = applyOperations(baseWorkflow(), ops);
			expect(result.success).toBe(false);
		});
	});

	describe('setNodeCredential', () => {
		test('sets credentials and preserves other credential entries', () => {
			const wf = baseWorkflow();
			wf.nodes[0].credentials = { other: { id: 'o1', name: 'OtherCred' } };
			const ops: PartialUpdateOperation[] = [
				{
					type: 'setNodeCredential',
					nodeName: 'A',
					credentialKey: 'slackApi',
					credentialId: 'cred-1',
					credentialName: 'My Slack',
				},
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes[0].credentials).toEqual({
				other: { id: 'o1', name: 'OtherCred' },
				slackApi: { id: 'cred-1', name: 'My Slack' },
			});
		});
	});

	describe('setNodePosition / setNodeDisabled', () => {
		test('updates position', () => {
			const result = applyOperations(baseWorkflow(), [
				{ type: 'setNodePosition', nodeName: 'A', position: [123, 456] },
			]);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes[0].position).toEqual([123, 456]);
		});

		test('updates disabled flag', () => {
			const result = applyOperations(baseWorkflow(), [
				{ type: 'setNodeDisabled', nodeName: 'A', disabled: true },
			]);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.nodes[0].disabled).toBe(true);
		});
	});

	describe('setWorkflowMetadata', () => {
		test('updates name and description', () => {
			const result = applyOperations(baseWorkflow(), [
				{ type: 'setWorkflowMetadata', name: 'New', description: 'updated' },
			]);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.workflow.name).toBe('New');
			expect(result.workflow.description).toBe('updated');
		});
	});

	describe('atomicity', () => {
		test('rolls back the whole batch if any op fails', () => {
			const wf = baseWorkflow();
			const before = JSON.stringify(wf);
			const ops: PartialUpdateOperation[] = [
				{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				{ type: 'removeNode', nodeName: 'Missing' },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.opIndex).toBe(1);
			expect(JSON.stringify(wf)).toBe(before);
		});
	});

	describe('object key safety', () => {
		test('strips unsafe keys from updateNodeParameters merge', () => {
			const wf = baseWorkflow();
			const ops: PartialUpdateOperation[] = [
				{
					type: 'updateNodeParameters',
					nodeName: 'B',
					parameters: { __proto__: { polluted: true }, url: 'https://safe' } as Record<
						string,
						unknown
					>,
				},
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
			const params = result.workflow.nodes.find((n) => n.name === 'B')!.parameters as Record<
				string,
				unknown
			>;
			expect(params.url).toBe('https://safe');
			expect(Object.prototype.hasOwnProperty.call(params, '__proto__')).toBe(false);
		});

		test('strips unsafe keys from nested parameters', () => {
			const wf = baseWorkflow();
			const ops: PartialUpdateOperation[] = [
				{
					type: 'updateNodeParameters',
					nodeName: 'B',
					parameters: {
						options: { constructor: { polluted: true }, mode: 'manual' },
					} as Record<string, unknown>,
				},
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(true);
			if (!result.success) return;
			const params = result.workflow.nodes.find((n) => n.name === 'B')!.parameters as Record<
				string,
				Record<string, unknown>
			>;
			expect(params.options.mode).toBe('manual');
			expect(Object.prototype.hasOwnProperty.call(params.options, 'constructor')).toBe(false);
		});

		test('rejects addNode with unsafe name', () => {
			const wf = baseWorkflow();
			const ops: PartialUpdateOperation[] = [
				{
					type: 'addNode',
					node: { name: '__proto__', type: 'n8n-nodes-base.set', typeVersion: 1 },
				},
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(false);
		});

		test('rejects renameNode to unsafe name', () => {
			const wf = baseWorkflow();
			const ops: PartialUpdateOperation[] = [
				{ type: 'renameNode', oldName: 'A', newName: 'constructor' },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(false);
		});

		test('rejects addConnection with unsafe source', () => {
			const wf = baseWorkflow();
			wf.nodes.push(makeNode({ id: 'p', name: '__proto__' }));
			const ops: PartialUpdateOperation[] = [
				{ type: 'addConnection', source: '__proto__', target: 'B' },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(false);
		});

		test('rejects addConnection with unsafe connectionType', () => {
			const wf = baseWorkflow();
			const ops: PartialUpdateOperation[] = [
				{ type: 'addConnection', source: 'A', target: 'B', connectionType: '__proto__' },
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(false);
		});

		test('rejects setNodeCredential with unsafe credentialKey', () => {
			const wf = baseWorkflow();
			const ops: PartialUpdateOperation[] = [
				{
					type: 'setNodeCredential',
					nodeName: 'B',
					credentialKey: '__proto__',
					credentialId: 'c1',
					credentialName: 'cred',
				},
			];
			const result = applyOperations(wf, ops);
			expect(result.success).toBe(false);
		});
	});
});
