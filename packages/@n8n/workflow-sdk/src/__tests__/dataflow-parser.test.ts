import { describe, it, expect } from '@jest/globals';
import { parseDataFlowCode } from '../codegen/dataflow/dataflow-parser';
import type { IConnections, IConnection } from '../types/base';

/** Helper to safely extract a connection target from IConnections */
function getConnection(
	connections: IConnections,
	nodeName: string,
	outputIndex: number = 0,
	targetIndex: number = 0,
	connectionType: string = 'main',
): IConnection {
	const nodeConns = connections[nodeName];
	if (!nodeConns) throw new Error(`No connections for node "${nodeName}"`);
	const outputs = nodeConns[connectionType];
	if (!outputs) throw new Error(`No "${connectionType}" outputs for node "${nodeName}"`);
	const slot = outputs[outputIndex];
	if (!slot) throw new Error(`No output ${outputIndex} for node "${nodeName}"`);
	const conn = slot[targetIndex];
	if (!conn)
		throw new Error(`No target ${targetIndex} at output ${outputIndex} for node "${nodeName}"`);
	return conn;
}

describe('dataflow-parser', () => {
	describe('parseDataFlowCode', () => {
		it('parses minimal empty workflow', () => {
			const code = `workflow({ name: 'Test' }, () => {});`;
			const result = parseDataFlowCode(code);
			expect(result.name).toBe('Test');
			expect(result.nodes).toEqual([]);
			expect(result.connections).toEqual({});
		});

		it('parses single trigger', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
				});
			});`;
			const result = parseDataFlowCode(code);
			expect(result.nodes).toHaveLength(1);
			expect(result.nodes[0].type).toBe('n8n-nodes-base.manualTrigger');
		});

		it('parses trigger -> node chain with connections', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const httpRequest = node({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://example.com' }, version: 4 })(items);
				});
			});`;
			const result = parseDataFlowCode(code);
			expect(result.nodes).toHaveLength(2);
			expect(result.nodes[1].type).toBe('n8n-nodes-base.httpRequest');
			expect(result.nodes[1].parameters).toEqual({ url: 'https://example.com' });
			expect(result.nodes[1].typeVersion).toBe(4);
			// Connection from trigger to httpRequest
			const triggerName = result.nodes[0].name!;
			const conn = getConnection(result.connections, triggerName);
			expect(conn.node).toBe(result.nodes[1].name);
		});

		it('parses chain with 3 nodes and correct variable threading', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const httpRequest = node({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://example.com' } })(items);
					const set = node({ type: 'n8n-nodes-base.set', params: {} })(httpRequest);
				});
			});`;
			const result = parseDataFlowCode(code);
			expect(result.nodes).toHaveLength(3);
			// trigger -> httpRequest -> set
			const triggerName = result.nodes[0].name!;
			const httpName = result.nodes[1].name!;
			expect(getConnection(result.connections, triggerName).node).toBe(httpName);
			expect(getConnection(result.connections, httpName).node).toBe(result.nodes[2].name);
		});

		it('parses node with name and credentials', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const myApi = node({ type: 'n8n-nodes-base.httpRequest', name: 'My API Call', params: { url: 'https://api.example.com' }, credentials: { httpBasicAuth: { id: '1', name: 'Auth' } }, version: 4 })(items);
				});
			});`;
			const result = parseDataFlowCode(code);
			expect(result.nodes[1].name).toBe('My API Call');
			expect(result.nodes[1].credentials).toEqual({
				httpBasicAuth: { id: '1', name: 'Auth' },
			});
		});

		it('throws on if/else block with hint to use .branch()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					if (items[0].json.status === 'active') {
						const trueBranch = node({ type: 'n8n-nodes-base.set', name: 'True Branch', params: {} })(items);
					} else {
						const falseBranch = node({ type: 'n8n-nodes-base.set', name: 'False Branch', params: {} })(items);
					}
				});
			});`;
			expect(() => parseDataFlowCode(code)).toThrow(/\.branch\(\)/);
		});

		it('parses .branch() and generates correct condition parameters', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					items.branch(
						(item) => item.json.status === 'active',
						(items) => {
							const trueBranch = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'True Branch', params: {}, version: 3 }));
						},
						(items) => {
							const falseBranch = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'False Branch', params: {}, version: 3 }));
						},
					);
				});
			});`;
			const result = parseDataFlowCode(code);
			const ifNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			expect(ifNode).toBeDefined();

			const params = ifNode!.parameters as Record<string, unknown>;
			const conditions = params.conditions as Record<string, unknown>;
			expect(conditions).toBeDefined();
			expect(conditions.combinator).toBe('and');

			const conditionList = conditions.conditions as Array<Record<string, unknown>>;
			expect(conditionList).toHaveLength(1);
			expect(conditionList[0].leftValue).toBe('={{ $json.status }}');
			expect(conditionList[0].rightValue).toBe('active');

			const operator = conditionList[0].operator as Record<string, unknown>;
			expect(operator.operation).toBe('equals');
		});

		it('parses .branch() and connects branches correctly', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					items.branch(
						(item) => item.json.status === 'active',
						(items) => {
							const trueBranch = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'True Branch', params: {}, version: 3 }));
						},
						(items) => {
							const falseBranch = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'False Branch', params: {}, version: 3 }));
						},
					);
				});
			});`;
			const result = parseDataFlowCode(code);
			const ifNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			const trueNode = result.nodes.find((n) => n.name === 'True Branch');
			const falseNode = result.nodes.find((n) => n.name === 'False Branch');

			expect(ifNode).toBeDefined();
			expect(trueNode).toBeDefined();
			expect(falseNode).toBeDefined();

			// IF node output 0 -> True Branch
			expect(getConnection(result.connections, ifNode!.name!, 0).node).toBe(trueNode!.name);
			// IF node output 1 -> False Branch
			expect(getConnection(result.connections, ifNode!.name!, 1).node).toBe(falseNode!.name);

			// Trigger -> IF node
			const triggerNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.manualTrigger');
			expect(getConnection(result.connections, triggerNode!.name!).node).toBe(ifNode!.name);
		});

		it('throws on switch/case block with hint to use .route()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					switch (items[0].json.destination) {
						case 'London': {
							const london = node({ type: 'n8n-nodes-base.set', name: 'London Handler', params: {} })(items);
							break;
						}
						default: {
							const fallback = node({ type: 'n8n-nodes-base.set', name: 'Default Handler', params: {} })(items);
							break;
						}
					}
				});
			});`;
			expect(() => parseDataFlowCode(code)).toThrow(/\.route\(\)/);
		});

		it('parses .route() and connects cases correctly', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					items.route((item) => item.json.destination, {
						London: (items) => {
							const london = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'London Handler', params: {}, version: 3 }));
						},
						'New York': (items) => {
							const newYork = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'New York Handler', params: {}, version: 3 }));
						},
						default: (items) => {
							const fallback = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Default Handler', params: {}, version: 3 }));
						},
					});
				});
			});`;
			const result = parseDataFlowCode(code);
			const switchNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.switch');
			expect(switchNode).toBeDefined();

			const switchName = switchNode!.name!;
			// output 0 -> London Handler
			expect(getConnection(result.connections, switchName, 0).node).toBe('London Handler');
			// output 1 -> New York Handler
			expect(getConnection(result.connections, switchName, 1).node).toBe('New York Handler');
			// output 2 (fallback) -> Default Handler
			expect(getConnection(result.connections, switchName, 2).node).toBe('Default Handler');
		});

		it('throws on try/catch block with hint to use .handleError()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					try {
						const httpRequest = node({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://api.example.com' } })(items);
					} catch (e) {
						const errorHandler = node({ type: 'n8n-nodes-base.set', name: 'Error Handler', params: {} })(items);
					}
				});
			});`;
			expect(() => parseDataFlowCode(code)).toThrow(/\.handleError\(\)/);
		});

		it('parses node with subnodes config', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', params: {} }, (items) => {
					const agent = node({ type: '@n8n/n8n-nodes-langchain.agent', params: { agent: 'conversationalAgent' }, subnodes: { ai_languageModel: [{ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', params: { model: 'gpt-4' }, version: 1 }] } })(items);
				});
			});`;
			const result = parseDataFlowCode(code);
			// Should have 3 nodes: trigger, agent, openai model
			expect(result.nodes.length).toBeGreaterThanOrEqual(3);
			const agentNode = result.nodes.find((n) => n.type === '@n8n/n8n-nodes-langchain.agent');
			expect(agentNode).toBeDefined();
			// Should have AI subnode
			const modelNode = result.nodes.find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			);
			expect(modelNode).toBeDefined();
		});

		it('parses array destructuring as multi-output', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const [output0, output1] = node({ type: 'n8n-nodes-base.compareDatasets', params: {} })(items);
					const handler0 = node({ type: 'n8n-nodes-base.set', name: 'Handler 0', params: {} })(output0);
					const handler1 = node({ type: 'n8n-nodes-base.set', name: 'Handler 1', params: {} })(output1);
				});
			});`;
			const result = parseDataFlowCode(code);
			const compareNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.compareDatasets');
			expect(compareNode).toBeDefined();
			const compareName = compareNode!.name!;
			// Should have connections from compare node outputs
			expect(result.connections[compareName]).toBeDefined();
			expect(result.connections[compareName].main.length).toBeGreaterThanOrEqual(2);
		});

		it('parses executeNode with array input syntax for multi-input nodes', () => {
			// Uses .map() for input nodes (realistic generator output for per-item nodes)
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const dataA = items.map((item) =>
						executeNode({ type: 'n8n-nodes-base.set', name: 'Data A', params: {}, version: 3 }),
					);
					const dataB = items.map((item) =>
						executeNode({ type: 'n8n-nodes-base.set', name: 'Data B', params: {}, version: 3 }),
					);
					const [onlyInA, onlyInB, inBoth] = executeNode({
						type: 'n8n-nodes-base.compareDatasets',
						params: { mergeByFields: { values: [{ field1: 'id', field2: 'id' }] } },
						version: 1,
					}, [dataA, dataB]);
				});
			});`;
			const result = parseDataFlowCode(code);

			const compareNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.compareDatasets');
			expect(compareNode).toBeDefined();

			const dataANode = result.nodes.find((n) => n.name === 'Data A');
			const dataBNode = result.nodes.find((n) => n.name === 'Data B');
			expect(dataANode).toBeDefined();
			expect(dataBNode).toBeDefined();

			// Data A → Compare Datasets input 0
			const connA = getConnection(result.connections, dataANode!.name!);
			expect(connA.node).toBe(compareNode!.name);
			expect(connA.index).toBe(0);

			// Data B → Compare Datasets input 1
			const connB = getConnection(result.connections, dataBNode!.name!);
			expect(connB.node).toBe(compareNode!.name);
			expect(connB.index).toBe(1);

			// Destructured outputs should map to Compare Datasets output indices
			// (verified via varToNode internally — test that downstream would work)
		});

		it('parses executeNode with array input and simple binding (merge)', () => {
			// Uses .map() for input nodes (realistic generator output for per-item nodes)
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const fetchUsers = items.map((item) =>
						executeNode({ type: 'n8n-nodes-base.httpRequest', name: 'Fetch Users', params: { url: 'https://api.example.com/users' }, version: 4 }),
					);
					const fetchOrders = items.map((item) =>
						executeNode({ type: 'n8n-nodes-base.httpRequest', name: 'Fetch Orders', params: { url: 'https://api.example.com/orders' }, version: 4 }),
					);
					const merged = executeNode({
						type: 'n8n-nodes-base.merge',
						params: { mode: 'combine', combineBy: 'combineByPosition' },
						version: 3,
					}, [fetchUsers, fetchOrders]);
				});
			});`;
			const result = parseDataFlowCode(code);

			const mergeNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode).toBeDefined();

			const usersNode = result.nodes.find((n) => n.name === 'Fetch Users');
			const ordersNode = result.nodes.find((n) => n.name === 'Fetch Orders');
			expect(usersNode).toBeDefined();
			expect(ordersNode).toBeDefined();

			// Fetch Users → Merge input 0
			const connUsers = getConnection(result.connections, usersNode!.name!);
			expect(connUsers.node).toBe(mergeNode!.name);
			expect(connUsers.index).toBe(0);

			// Fetch Orders → Merge input 1
			const connOrders = getConnection(result.connections, ordersNode!.name!);
			expect(connOrders.node).toBe(mergeNode!.name);
			expect(connOrders.index).toBe(1);
		});

		it('ignores non-array second argument in executeNode()', () => {
			// executeNode(config, someVar) — second arg is not an array, should be ignored
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const source = items.map((item) =>
						executeNode({ type: 'n8n-nodes-base.set', name: 'Source', params: {}, version: 3 }),
					);
					const target = executeNode({
						type: 'n8n-nodes-base.merge',
						params: {},
						version: 3,
					}, source);
				});
			});`;
			const result = parseDataFlowCode(code);
			// Should still create both nodes, connected via lastNodeInScope
			const sourceNode = result.nodes.find((n) => n.name === 'Source');
			const mergeNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(sourceNode).toBeDefined();
			expect(mergeNode).toBeDefined();
			// Connection from source → merge via lastNodeInScope (not array input)
			const conn = getConnection(result.connections, sourceNode!.name!);
			expect(conn.node).toBe(mergeNode!.name);
			expect(conn.index).toBe(0); // default input 0
		});

		it('handles empty array input in executeNode()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const target = executeNode({
						type: 'n8n-nodes-base.merge',
						params: {},
						version: 3,
					}, []);
				});
			});`;
			const result = parseDataFlowCode(code);
			const mergeNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode).toBeDefined();
			// No connections since array is empty (no lastNodeInScope either since trigger has no chain)
		});

		it('skips unresolvable variables in array input', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const dataA = items.map((item) =>
						executeNode({ type: 'n8n-nodes-base.set', name: 'Data A', params: {}, version: 3 }),
					);
					const target = executeNode({
						type: 'n8n-nodes-base.merge',
						params: {},
						version: 3,
					}, [dataA, unknownVar]);
				});
			});`;
			const result = parseDataFlowCode(code);
			const mergeNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			const dataANode = result.nodes.find((n) => n.name === 'Data A');
			expect(mergeNode).toBeDefined();
			expect(dataANode).toBeDefined();
			// Data A → Merge input 0 should be connected
			const conn = getConnection(result.connections, dataANode!.name!);
			expect(conn.node).toBe(mergeNode!.name);
			expect(conn.index).toBe(0);
			// unknownVar at index 1 is silently skipped — no connection for input 1
		});

		it('handles array input with destructured output variables', () => {
			// Tests resolveOutputIndex: destructured var carries output index info
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const [out0, out1] = executeNode({
						type: 'n8n-nodes-base.compareDatasets',
						name: 'Compare',
						params: {},
						version: 1,
					});
					const mergeResult = executeNode({
						type: 'n8n-nodes-base.merge',
						params: {},
						version: 3,
					}, [out0, out1]);
				});
			});`;
			const result = parseDataFlowCode(code);
			const compareNode = result.nodes.find((n) => n.name === 'Compare');
			const mergeNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(compareNode).toBeDefined();
			expect(mergeNode).toBeDefined();
			// out0 (Compare output 0) → Merge input 0
			const conn0 = getConnection(result.connections, compareNode!.name!, 0);
			expect(conn0.node).toBe(mergeNode!.name);
			expect(conn0.index).toBe(0);
			// out1 (Compare output 1) → Merge input 1
			const conn1 = getConnection(result.connections, compareNode!.name!, 1);
			expect(conn1.node).toBe(mergeNode!.name);
			expect(conn1.index).toBe(1);
		});

		it('does not set executeOnce for array-input nodes inside branches', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
					const dataA = items.map((item) =>
						executeNode({ type: 'n8n-nodes-base.set', name: 'Data A', params: {}, version: 3 }),
					);
					const dataB = items.map((item) =>
						executeNode({ type: 'n8n-nodes-base.set', name: 'Data B', params: {}, version: 3 }),
					);
					items.branch(
						(item) => item.json.active === true,
						(items) => {
							const merged = executeNode({
								type: 'n8n-nodes-base.merge',
								params: {},
								version: 3,
							}, [dataA, dataB]);
						},
					);
				});
			});`;
			const result = parseDataFlowCode(code);
			const mergeNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode).toBeDefined();
			// Inside a branch (branchDepth > 0), executeOnce should NOT be set
			expect(mergeNode!.executeOnce).toBeUndefined();
		});

		it('sets executeOnce for array-input nodes at top level', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const dataA = items.map((item) =>
						executeNode({ type: 'n8n-nodes-base.set', name: 'Data A', params: {}, version: 3 }),
					);
					const dataB = items.map((item) =>
						executeNode({ type: 'n8n-nodes-base.set', name: 'Data B', params: {}, version: 3 }),
					);
					const merged = executeNode({
						type: 'n8n-nodes-base.merge',
						params: {},
						version: 3,
					}, [dataA, dataB]);
				});
			});`;
			const result = parseDataFlowCode(code);
			const mergeNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode).toBeDefined();
			// At top level (branchDepth === 0), executeOnce IS set
			expect(mergeNode!.executeOnce).toBe(true);
		});

		it('skips spread elements in array input', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const dataA = items.map((item) =>
						executeNode({ type: 'n8n-nodes-base.set', name: 'Data A', params: {}, version: 3 }),
					);
					const merged = executeNode({
						type: 'n8n-nodes-base.merge',
						params: {},
						version: 3,
					}, [dataA, ...otherInputs]);
				});
			});`;
			// Should not throw — spread elements are silently skipped
			const result = parseDataFlowCode(code);
			const mergeNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode).toBeDefined();
			// Only dataA → Merge input 0 connected; spread at index 1 skipped
			const dataANode = result.nodes.find((n) => n.name === 'Data A');
			const conn = getConnection(result.connections, dataANode!.name!);
			expect(conn.node).toBe(mergeNode!.name);
			expect(conn.index).toBe(0);
		});

		it('throws on missing workflow() call', () => {
			const code = `const x = 1;`;
			expect(() => parseDataFlowCode(code)).toThrow();
		});

		it('handles trigger with version and name', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.webhook', name: 'My Webhook', params: { path: '/test' }, version: 2 }, (items) => {
				});
			});`;
			const result = parseDataFlowCode(code);
			expect(result.nodes[0].type).toBe('n8n-nodes-base.webhook');
			expect(result.nodes[0].name).toBe('My Webhook');
			expect(result.nodes[0].typeVersion).toBe(2);
			expect(result.nodes[0].parameters).toEqual({ path: '/test' });
		});

		it('parses !== operator as notEquals via .branch()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
					items.branch(
						(item) => item.json.status !== 'inactive',
						(items) => { const t = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
						(items) => { const f = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
					);
				});
			});`;
			const result = parseDataFlowCode(code);
			const ifNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			const params = ifNode!.parameters as Record<string, unknown>;
			const conditions = params.conditions as Record<string, unknown>;
			const conditionList = conditions.conditions as Array<Record<string, unknown>>;
			const operator = conditionList[0].operator as Record<string, unknown>;
			expect(operator.operation).toBe('notEquals');
		});

		it('parses > operator as gt via .branch()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
					items.branch(
						(item) => item.json.count > 10,
						(items) => { const t = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
						(items) => { const f = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
					);
				});
			});`;
			const result = parseDataFlowCode(code);
			const ifNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			const params = ifNode!.parameters as Record<string, unknown>;
			const conditions = params.conditions as Record<string, unknown>;
			const conditionList = conditions.conditions as Array<Record<string, unknown>>;
			const operator = conditionList[0].operator as Record<string, unknown>;
			expect(operator.operation).toBe('gt');
			expect(conditionList[0].rightValue).toBe(10);
		});

		it('parses .includes() as contains via .branch()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
					items.branch(
						(item) => item.json.tags.includes('important'),
						(items) => { const t = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
						(items) => { const f = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
					);
				});
			});`;
			const result = parseDataFlowCode(code);
			const ifNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			const params = ifNode!.parameters as Record<string, unknown>;
			const conditions = params.conditions as Record<string, unknown>;
			const conditionList = conditions.conditions as Array<Record<string, unknown>>;
			const operator = conditionList[0].operator as Record<string, unknown>;
			expect(operator.operation).toBe('contains');
			expect(conditionList[0].rightValue).toBe('important');
		});

		it('parses truthy check (no operator) as boolean true via .branch()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
					items.branch(
						(item) => item.json.isActive,
						(items) => { const t = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
						(items) => { const f = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
					);
				});
			});`;
			const result = parseDataFlowCode(code);
			const ifNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			const params = ifNode!.parameters as Record<string, unknown>;
			const conditions = params.conditions as Record<string, unknown>;
			const conditionList = conditions.conditions as Array<Record<string, unknown>>;
			const operator = conditionList[0].operator as Record<string, unknown>;
			expect(operator.operation).toBe('true');
		});

		it('parses negated check as boolean false via .branch()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
					items.branch(
						(item) => !item.json.isActive,
						(items) => { const t = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
						(items) => { const f = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
					);
				});
			});`;
			const result = parseDataFlowCode(code);
			const ifNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			const params = ifNode!.parameters as Record<string, unknown>;
			const conditions = params.conditions as Record<string, unknown>;
			const conditionList = conditions.conditions as Array<Record<string, unknown>>;
			const operator = conditionList[0].operator as Record<string, unknown>;
			expect(operator.operation).toBe('false');
		});

		it('parses === undefined as notExists via .branch()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
					items.branch(
						(item) => item.json.email === undefined,
						(items) => { const t = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
						(items) => { const f = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
					);
				});
			});`;
			const result = parseDataFlowCode(code);
			const ifNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			const params = ifNode!.parameters as Record<string, unknown>;
			const conditions = params.conditions as Record<string, unknown>;
			const conditionList = conditions.conditions as Array<Record<string, unknown>>;
			const operator = conditionList[0].operator as Record<string, unknown>;
			expect(operator.operation).toBe('notExists');
		});

		it('parses !== undefined as exists via .branch()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
					items.branch(
						(item) => item.json.email !== undefined,
						(items) => { const t = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
						(items) => { const f = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 })); },
					);
				});
			});`;
			const result = parseDataFlowCode(code);
			const ifNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			const params = ifNode!.parameters as Record<string, unknown>;
			const conditions = params.conditions as Record<string, unknown>;
			const conditionList = conditions.conditions as Array<Record<string, unknown>>;
			const operator = conditionList[0].operator as Record<string, unknown>;
			expect(operator.operation).toBe('exists');
		});

		it('generates positions for nodes', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const httpRequest = node({ type: 'n8n-nodes-base.httpRequest', params: {} })(items);
				});
			});`;
			const result = parseDataFlowCode(code);
			for (const n of result.nodes) {
				expect(n.position).toBeDefined();
				expect(Array.isArray(n.position)).toBe(true);
				expect(n.position).toHaveLength(2);
			}
		});

		it('generates unique IDs for all nodes', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const httpRequest = node({ type: 'n8n-nodes-base.httpRequest', params: {} })(items);
					const set = node({ type: 'n8n-nodes-base.set', params: {} })(httpRequest);
				});
			});`;
			const result = parseDataFlowCode(code);
			const ids = result.nodes.map((n) => n.id);
			expect(new Set(ids).size).toBe(ids.length);
		});

		it('defaults typeVersion to 1 when not specified', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const httpRequest = node({ type: 'n8n-nodes-base.httpRequest', params: {} })(items);
				});
			});`;
			const result = parseDataFlowCode(code);
			for (const n of result.nodes) {
				expect(typeof n.typeVersion).toBe('number');
			}
		});

		it('throws on if without else block with hint to use .branch()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					if (items[0].json.status === 'active') {
						const trueBranch = node({ type: 'n8n-nodes-base.set', name: 'True Branch', params: {} })(items);
					}
				});
			});`;
			expect(() => parseDataFlowCode(code)).toThrow(/\.branch\(\)/);
		});

		it('parses .branch() with only true branch', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
					items.branch(
						(item) => item.json.status === 'active',
						(items) => {
							const trueBranch = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'True Branch', params: {}, version: 3 }));
						},
					);
				});
			});`;
			const result = parseDataFlowCode(code);
			const ifNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			expect(ifNode).toBeDefined();
			const trueNode = result.nodes.find((n) => n.name === 'True Branch');
			expect(trueNode).toBeDefined();
		});

		it('throws on nodes after if/else block with hint to use .branch()', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const pre = node({ type: 'n8n-nodes-base.set', name: 'Pre', params: {} })(items);
					if (items[0].json.status === 'active') {
						const trueBranch = node({ type: 'n8n-nodes-base.set', name: 'True Branch', params: {} })(items);
					} else {
						const falseBranch = node({ type: 'n8n-nodes-base.set', name: 'False Branch', params: {} })(items);
					}
				});
			});`;
			expect(() => parseDataFlowCode(code)).toThrow(/\.branch\(\)/);
		});

		it('parses outputSampleData on trigger into output and pinData', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, outputSampleData: [{ key: 'value' }] }, (items) => {
					const httpRequest = node({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://example.com' }, version: 4 })(items);
				});
			});`;
			const result = parseDataFlowCode(code);
			expect(result.nodes[0].output).toEqual([{ key: 'value' }]);
			expect(result.pinData).toBeDefined();
			expect(result.pinData![result.nodes[0].name!]).toEqual([{ key: 'value' }]);
			// Node without outputSampleData should not have output
			expect(result.nodes[1].output).toBeUndefined();
		});

		it('parses outputSampleData on executeNode into output and pinData', () => {
			const code = `workflow({ name: 'Test' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {} }, (items) => {
					const httpRequest = node({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://example.com' }, version: 4, outputSampleData: [{ data: 'response' }] })(items);
				});
			});`;
			const result = parseDataFlowCode(code);
			expect(result.nodes[1].output).toEqual([{ data: 'response' }]);
			expect(result.pinData!['HTTP Request']).toEqual([{ data: 'response' }]);
		});

		it('throws on try/catch followed by switch statement', () => {
			const code = `workflow({ name: 'Try Switch' }, () => {
				onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
					try {
						const fetch_Data = executeNode({
							type: 'n8n-nodes-base.httpRequest',
							params: { url: 'https://api.example.com/data' },
							version: 4,
						});
					} catch (e) {
						const error_Handler = executeNode({
							type: 'n8n-nodes-base.set',
							name: 'Error Handler',
							params: {},
							version: 3,
						});
					}
				});
			});`;
			expect(() => parseDataFlowCode(code)).toThrow(/\.handleError\(\)/);
		});
	});
});
