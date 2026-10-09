import { AgentJsonConfigSchema } from '@n8n/api-types';
import fc from 'fast-check';
import { STICKY_NODE_TYPE, type IConnections, type INode } from 'n8n-workflow';

import {
	findDanglingConnections,
	findUnboundedCycles,
	findUnreachableNodes,
	findWriteAccess,
	listEdges,
	outputRunIndexLimit,
	runIndexLimit,
	withoutOutputs,
	type Edge,
} from './factory-pack-checks';

type EdgeTuple = [from: number, to: number, outputIndex: number];

const nodeName = (index: number) => `n${index}`;

function makeNode(name: string, type = 'n8n-nodes-base.noOp', parameters = {}): INode {
	return { id: name, name, type, typeVersion: 1, position: [0, 0], parameters };
}

function connectionsFromEdges(edges: EdgeTuple[]): IConnections {
	const connections: IConnections = {};
	for (const [from, to, outputIndex] of edges) {
		const outputs = ((connections[nodeName(from)] ??= {}).main ??= []);
		while (outputs.length <= outputIndex) outputs.push([]);
		(outputs[outputIndex] ??= []).push({ node: nodeName(to), type: 'main', index: 0 });
	}
	return connections;
}

const toEdge = ([from, to, outputIndex]: EdgeTuple): Edge => ({
	source: nodeName(from),
	type: 'main',
	outputIndex,
	target: nodeName(to),
});

/** Small, overlapping domains so that edges collide into diamonds and cycles. */
const graphArbitrary = fc.integer({ min: 1, max: 6 }).chain((nodeCount) =>
	fc.record({
		nodeCount: fc.constant(nodeCount),
		edges: fc.uniqueArray(
			fc.tuple(
				fc.integer({ min: 0, max: nodeCount - 1 }),
				fc.integer({ min: 0, max: nodeCount - 1 }),
				fc.integer({ min: 0, max: 2 }),
			),
			{ maxLength: 12, selector: ([from, to, output]) => `${from}-${output}->${to}` },
		),
		breakers: fc.uniqueArray(
			fc.tuple(fc.integer({ min: 0, max: nodeCount - 1 }), fc.integer({ min: 0, max: 2 })),
			{ maxLength: 6, selector: ([node, output]) => `${node}:${output}` },
		),
	}),
);

const nodesOf = (nodeCount: number) =>
	Array.from({ length: nodeCount }, (_, index) => makeNode(nodeName(index)));

/** Model oracle: the nodes that each node reaches over at least one edge. */
function reachability(nodeCount: number, edges: EdgeTuple[]): Map<string, Set<string>> {
	const reached = new Map<string, Set<string>>();
	for (let start = 0; start < nodeCount; start++) {
		const seen = new Set<number>();
		const queue = edges.filter(([from]) => from === start).map(([, to]) => to);
		while (queue.length > 0) {
			const next = queue.shift() ?? start;
			if (seen.has(next)) continue;
			seen.add(next);
			queue.push(...edges.filter(([from]) => from === next).map(([, to]) => to));
		}
		reached.set(nodeName(start), new Set([...seen].map(nodeName)));
	}
	return reached;
}

describe('listEdges and findDanglingConnections', () => {
	it('lists each connection once, with its output index', () => {
		const edges: EdgeTuple[] = [
			[0, 1, 0],
			[0, 2, 1],
			[1, 1, 0],
		];

		expect(listEdges(connectionsFromEdges(edges))).toEqual(edges.map(toEdge));
	});

	it('reports connections whose source or target is not a node', () => {
		const connections = connectionsFromEdges([
			[0, 1, 0],
			[0, 7, 1],
			[8, 1, 0],
		]);

		expect(findDanglingConnections({ nodes: nodesOf(2), connections })).toEqual([
			'n0 -[main 1]-> n7',
			'n8 -[main 0]-> n1',
		]);
	});

	it('matches a model of the node set for any graph', () => {
		fc.assert(
			fc.property(graphArbitrary, fc.integer({ min: 0, max: 6 }), ({ edges }, present) => {
				const nodes = nodesOf(present);
				const expected = edges
					.filter(([from, to]) => from >= present || to >= present)
					.map((edge) => {
						const { source, outputIndex, target } = toEdge(edge);
						return `${source} -[main ${outputIndex}]-> ${target}`;
					});

				const dangling = findDanglingConnections({
					nodes,
					connections: connectionsFromEdges(edges),
				});

				expect(dangling.sort()).toEqual(expected.sort());
			}),
		);
	});
});

describe('withoutOutputs', () => {
	it('removes exactly the selected outputs and keeps the input unchanged', () => {
		fc.assert(
			fc.property(graphArbitrary, ({ edges, breakers }) => {
				const connections = connectionsFromEdges(edges);
				const before = JSON.stringify(connections);
				const isDropped = (source: string, index: number) =>
					breakers.some(([node, output]) => nodeName(node) === source && output === index);

				expect(listEdges(withoutOutputs(connections, isDropped))).toEqual(
					listEdges(connections).filter((edge) => !isDropped(edge.source, edge.outputIndex)),
				);
				expect(JSON.stringify(connections)).toBe(before);
			}),
		);
	});
});

describe('findUnreachableNodes', () => {
	const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
	const isTrigger = (node: INode) => node === trigger;

	it('reports nodes without a path from a trigger and ignores sticky notes', () => {
		const nodes = [
			trigger,
			makeNode('Reached'),
			makeNode('Loose'),
			makeNode('Note', STICKY_NODE_TYPE),
		];
		const connections: IConnections = {
			Trigger: { main: [[{ node: 'Reached', type: 'main', index: 0 }]] },
		};

		expect(findUnreachableNodes({ nodes, connections }, isTrigger)).toEqual(['Loose']);
	});

	it('follows every output of a node', () => {
		const nodes = [trigger, makeNode('Gate'), makeNode('False branch')];
		const connections: IConnections = {
			Trigger: { main: [[{ node: 'Gate', type: 'main', index: 0 }]] },
			Gate: { main: [[], [{ node: 'False branch', type: 'main', index: 0 }]] },
		};

		expect(findUnreachableNodes({ nodes, connections }, isTrigger)).toEqual([]);
	});
});

describe('findUnboundedCycles', () => {
	it('reports a self-loop and a loop of two nodes', () => {
		const connections = connectionsFromEdges([
			[0, 0, 0],
			[1, 2, 0],
			[2, 1, 0],
		]);

		expect(findUnboundedCycles({ nodes: nodesOf(3), connections }, () => false)).toEqual(
			expect.arrayContaining([['n0'], ['n1', 'n2']]),
		);
	});

	it('removes only the breaker output, so a loop through another output stays', () => {
		const connections = connectionsFromEdges([
			[0, 1, 0],
			[1, 0, 0],
			[1, 0, 1],
		]);
		const graph = { nodes: nodesOf(2), connections };

		expect(findUnboundedCycles(graph, (source, index) => source === 'n1' && index === 0)).toEqual([
			['n0', 'n1'],
		]);
		expect(findUnboundedCycles(graph, (source) => source === 'n1')).toEqual([]);
	});

	it('groups exactly the nodes on cycles into loops whose nodes all reach each other', () => {
		fc.assert(
			fc.property(graphArbitrary, ({ nodeCount, edges, breakers }) => {
				const isBreaker = (source: string, index: number) =>
					breakers.some(([node, output]) => nodeName(node) === source && output === index);
				const remaining = edges.filter(([from, , output]) => !isBreaker(nodeName(from), output));
				const reached = reachability(nodeCount, remaining);
				const reaches = (from: string, to: string) => reached.get(from)?.has(to) ?? false;
				const onCycle = [...reached.keys()].filter((name) => reaches(name, name));

				const cycles = findUnboundedCycles(
					{ nodes: nodesOf(nodeCount), connections: connectionsFromEdges(edges) },
					isBreaker,
				);

				expect(cycles.flat().sort()).toEqual(onCycle.sort());
				for (const cycle of cycles) {
					for (const from of cycle) {
						expect(cycle.every((to) => reaches(from, to))).toBe(true);
					}
				}
			}),
		);
	});

	it('finds no cycle in a graph whose edges only go forward', () => {
		fc.assert(
			fc.property(graphArbitrary, ({ nodeCount, edges }) => {
				const forward = edges.filter(([from, to]) => from < to);
				const graph = { nodes: nodesOf(nodeCount), connections: connectionsFromEdges(forward) };

				expect(findUnboundedCycles(graph, () => false)).toEqual([]);
			}),
		);
	});
});

describe('runIndexLimit', () => {
	const runIndexCondition = (
		operation: string,
		rightValue: unknown,
		leftValue = '={{ $runIndex }}',
	) => ({
		id: 'limit',
		leftValue,
		rightValue,
		operator: { type: 'number', operation },
	});
	const filter = (conditions: unknown[], combinator = 'and') => ({ conditions, combinator });
	const otherCondition = {
		id: 'other',
		leftValue: '={{ $json.check }}',
		rightValue: 'failed',
		operator: { type: 'string', operation: 'equals' },
	};
	/** Model oracle: how many run indexes from 0 to 199 pass the comparison. */
	const passingRuns = (passes: (runIndex: number) => boolean) =>
		Array.from({ length: 200 }, (_, runIndex) => runIndex).filter(passes).length;

	it('counts the runs that "lt" and "lte" let through', () => {
		fc.assert(
			fc.property(fc.double({ min: -5, max: 150, noNaN: true }), (limit) => {
				expect(runIndexLimit(filter([runIndexCondition('lt', limit)]))).toBe(
					passingRuns((runIndex) => runIndex < limit),
				);
				expect(runIndexLimit(filter([runIndexCondition('lte', limit)]))).toBe(
					passingRuns((runIndex) => runIndex <= limit),
				);
			}),
		);
	});

	it('keeps the smallest limit of an "and" filter, whatever the other conditions are', () => {
		fc.assert(
			fc.property(
				fc.array(fc.integer({ min: 0, max: 20 }), { minLength: 1, maxLength: 4 }),
				fc.boolean(),
				(limits, withOther) => {
					const conditions = limits.map((limit) => runIndexCondition('lt', limit));
					if (withOther) conditions.push(otherCondition);

					expect(runIndexLimit(filter(conditions))).toBe(Math.min(...limits));
				},
			),
		);
	});

	it.each([
		['an "or" filter', filter([runIndexCondition('lt', 3)], 'or')],
		['another left value', filter([runIndexCondition('lt', 3, '={{ $json.attempt }}')])],
		['a text limit', filter([runIndexCondition('lt', '3')])],
		['an infinite limit', filter([runIndexCondition('lt', Number.POSITIVE_INFINITY)])],
		['a "gt" comparison', filter([runIndexCondition('gt', 3)])],
		['no conditions', filter([])],
		['a filter without conditions', { combinator: 'and' }],
		['a value that is not a filter', 'nope'],
	])('finds no limit in %s', (_case, value) => {
		expect(runIndexLimit(value)).toBeUndefined();
	});

	it('reads the limit of a Switch rule output and of the true output of an If node', () => {
		const limited = filter([otherCondition, runIndexCondition('lt', 2)]);
		const switchNode = makeNode('Route', 'n8n-nodes-base.switch', {
			rules: { values: [{ conditions: filter([otherCondition]) }, { conditions: limited }] },
		});
		const ifNode = makeNode('Gate', 'n8n-nodes-base.if', { conditions: limited });
		const otherNode = makeNode('Other', 'n8n-nodes-base.filter', { conditions: limited });

		expect([0, 1, 2].map((index) => outputRunIndexLimit(switchNode, index))).toEqual([
			undefined,
			2,
			undefined,
		]);
		expect([0, 1].map((index) => outputRunIndexLimit(ifNode, index))).toEqual([2, undefined]);
		expect(outputRunIndexLimit(otherNode, 0)).toBeUndefined();
	});

	describe('Switch options', () => {
		const limited = filter([runIndexCondition('lt', 2)]);
		const switchWith = (parameters: Record<string, unknown>) =>
			makeNode('Route', 'n8n-nodes-base.switch', {
				rules: { values: [{ conditions: filter([otherCondition]) }, { conditions: limited }] },
				...parameters,
			});

		it.each([
			['the fallback output', { options: { fallbackOutput: 1 } }],
			['the fallback output, stored as text', { options: { fallbackOutput: '1' } }],
			['expression mode', { mode: 'expression' }],
		])('finds no limit on a rule output that is %s', (_case, parameters) => {
			expect(outputRunIndexLimit(switchWith(parameters), 1)).toBeUndefined();
		});

		it.each([
			['an extra fallback output', { options: { fallbackOutput: 'extra' } }],
			['a fallback on another output', { options: { fallbackOutput: 0 } }],
			['no fallback output', { options: { fallbackOutput: 'none' } }],
			// An item reaches a rule output only when that rule matches, also with this option.
			['all matching outputs', { options: { allMatchingOutputs: true } }],
			['rules mode', { mode: 'rules' }],
		])('keeps the limit of a rule output with %s', (_case, parameters) => {
			expect(outputRunIndexLimit(switchWith(parameters), 1)).toBe(2);
		});
	});
});

describe('findWriteAccess', () => {
	const agent = (config: Record<string, unknown> = {}) =>
		AgentJsonConfigSchema.parse({ name: 'Reviewer', model: '', instructions: '', ...config });
	const mcpServer = (toolFilter?: Record<string, unknown>) => ({
		name: 'github',
		url: 'https://mcp.example.com/mcp',
		...(toolFilter ? { toolFilter } : {}),
	});
	const nodeTool = (name: string, nodeParameters: Record<string, unknown>, extra = {}) => ({
		type: 'node',
		name,
		node: { nodeType: 'n8n-nodes-base.githubTool', nodeTypeVersion: 1.1, nodeParameters },
		...extra,
	});

	const readName = fc
		.tuple(
			fc.constantFrom('get', 'list', 'search', 'read', 'fetch', 'find', 'query', 'describe'),
			fc.constantFrom('file', 'issue', 'commit', 'diff', 'record', 'page'),
		)
		.map(([verb, noun]) => `${verb}_${noun}`);
	const writeName = fc
		.tuple(
			fc.constantFrom('create', 'update', 'delete', 'send', 'write', 'merge', 'push'),
			fc.constantFrom('file', 'issue', 'comment', 'branch', 'record'),
		)
		.map(([verb, noun]) => `${verb}_${noun}`);

	it('finds nothing for an agent without tools', () => {
		expect(findWriteAccess(agent())).toEqual([]);
	});

	it.each([
		['coding', { coding: { repositoryUrl: 'https://github.com/acme/repo' } }, 'coding lets'],
		['an enabled sub-agent', { subAgents: { agents: [{ agentId: 'a1' }] } }, 'sub-agents'],
		['a provider tool', { providerTools: { anthropic: { code_execution: {} } } }, 'provider tools'],
		['an integration', { integrations: [{ type: 'n8n_chat' }] }, 'integrations let'],
		[
			'a custom tool',
			{ tools: [{ type: 'custom', id: 'run_script' }] },
			'custom tool "run_script"',
		],
		[
			'a workflow tool',
			{ tools: [{ type: 'workflow', workflow: 'Get report' }] },
			'workflow tool "Get report"',
		],
		[
			'a node tool that needs approval',
			{ tools: [nodeTool('read_file', { operation: 'get' }, { requireApproval: true })] },
			'needs approval',
		],
		[
			'a node tool without an operation',
			{ tools: [nodeTool('call_api', { url: 'https://example.com' })] },
			'no operation',
		],
		['an MCP server without a tool filter', { mcpServers: [mcpServer()] }, 'no allow list'],
		[
			'an MCP server with an exclude filter',
			{ mcpServers: [mcpServer({ mode: 'exclude', tools: ['delete_file'] })] },
			'no allow list',
		],
	])('reports %s', (_case, config, reason) => {
		expect(findWriteAccess(agent(config))).toEqual([expect.stringContaining(reason)]);
	});

	it('ignores disabled tools and disabled sub-agents', () => {
		const config = agent({
			tools: [{ type: 'custom', id: 'run_script', enabled: false }],
			subAgents: { agents: [{ agentId: 'a1', enabled: false }] },
		});

		expect(findWriteAccess(config)).toEqual([]);
	});

	it('accepts read operations and reports each write operation by name', () => {
		fc.assert(
			fc.property(
				fc.uniqueArray(readName, { maxLength: 4 }),
				fc.uniqueArray(writeName, { maxLength: 3 }),
				(reads, writes) => {
					const config = agent({
						tools: [...reads, ...writes].map((name) =>
							nodeTool(`tool_${name}`, { operation: name }),
						),
						mcpServers: [mcpServer({ mode: 'allow', tools: [...reads, ...writes] })],
					});
					const reasons = findWriteAccess(config);

					expect(reasons).toHaveLength(writes.length * 2);
					for (const name of writes) {
						expect(reasons).toContain(`tool "tool_${name}" runs "${name}"`);
						expect(reasons).toContain(`MCP server "github" offers "${name}"`);
					}
				},
			),
		);
	});
});
