import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { listEdges } from './factory-pack-checks';
import { readPackText } from './factory-pack-files';
import {
	AGENT_IDS,
	MCP_CLIENT,
	earlierNodes,
	failingTestOutput,
	parameterOf,
	textOf,
	ticketOutput,
	workflow,
} from './factory-pack-fixtures';

/** The MCP tool calls of the template: the input that each one sends and the results it reads. */

const DIFF_SHA256 = 'c'.repeat(64);
const STICKY_NOTE = 'n8n-nodes-base.stickyNote';

/** The rows of the tool table in the README: name, input fields and result text. */
const toolTable = new Map(
	[...readPackText('README.md').matchAll(/^\| `(coding_\w+)` +\| ([^|]+)\| ([^|]+)\|$/gm)].map(
		([, tool, input, result]) => [
			tool,
			{ input: [...input.matchAll(/`(\w+)`/g)].map((match) => match[1]), result },
		],
	),
);

/**
 * The result fields that a row names: the code names in its sentences that start with "Returns".
 * A name that only appears in another sentence, for example "the same files as `changes`", is no
 * result field.
 */
function resultFieldsOf(result: string): Set<string> {
	const returned = result
		.split(/(?<=\.)\s+/)
		.filter((sentence) => sentence.startsWith('Returns'))
		.join(' ');
	return new Set([...returned.matchAll(/`(\w+)(?:\[[^`]*\])?`/g)].map((match) => match[1]));
}

const mcpNodes = workflow.nodes.filter((node) => node.type === MCP_CLIENT);
// The minimised diff that "Push branch" takes its hash from.
const minimisedRun = {
	'Get minimised diff': { structuredContent: { diff: '', changes: [], diffSha256: DIFF_SHA256 } },
};
const inputOf = (nodeName: string) =>
	z.record(z.unknown()).parse(
		jsonParse(
			textOf(nodeName, parameterOf(nodeName, 'jsonInput'), {
				nodes: { ...earlierNodes, ...minimisedRun },
			}),
		),
	);
const toolOf = (nodeName: string) =>
	z.object({ value: z.string() }).parse(parameterOf(nodeName, 'tool')).value;
const toolOfNode = new Map(mcpNodes.map((node) => [node.name, toolOf(node.name)]));

/** The tools whose results a node reads from its input: the nearest MCP nodes upstream. */
function upstreamToolsOf(nodeName: string, seen = new Set<string>()): string[] {
	if (seen.has(nodeName)) return [];
	seen.add(nodeName);
	return listEdges(workflow.connections)
		.filter((edge) => edge.target === nodeName)
		.flatMap(({ source }) => {
			const tool = toolOfNode.get(source);
			return tool ? [tool] : upstreamToolsOf(source, seen);
		});
}

/** The tools of the MCP nodes that a text names with `$('Name')`. */
const toolsNamedIn = (text: string) =>
	[...text.matchAll(/\$\('([^']+)'\)/g)].flatMap(([, name]) => toolOfNode.get(name) ?? []);

/** The tools that a node takes its results from, by the references in its text and its input. */
function sourcesOf(nodeName: string, text: string): string[] {
	const fromInput = /\$json|\$input/.test(text) ? upstreamToolsOf(nodeName) : [];
	return [...toolsNamedIn(text), ...fromInput];
}

/** A field that a node reads from a result. A node with several inputs may read it from any of them. */
interface ResultRead {
	node: string;
	tools: string[];
	field: string;
}

/** The result fields that each node reads, found in the text of the node. */
function readsOf(): ResultRead[] {
	const reads: ResultRead[] = [];
	const record = (node: string, tools: string[], field: string) => {
		if (tools.length === 0) throw new Error(`"${node}" reads "${field}" from no known tool`);
		reads.push({ node, tools: [...new Set(tools)], field });
	};

	for (const node of workflow.nodes) {
		if (node.type === STICKY_NOTE) continue;
		const text = JSON.stringify(node.parameters);
		// A variable holds a result when its value reads "structuredContent". Another variable holds
		// the input item, so only its "structuredContent" reads are results.
		const bindings = new Map<string, { tools: string[]; holdsResult: boolean }>();
		for (const [, name, value] of text.matchAll(/(?:const|let) (\w+) = ([^;]+);/g)) {
			const tools = sourcesOf(node.name, value);
			if (tools.length > 0) {
				bindings.set(name, { tools, holdsResult: value.includes('structuredContent') });
			}
		}
		// A helper that reads a result names its parameter "content". Its reads come from the
		// results that its callers pass.
		const contentTools: string[] = [];
		for (const [, helper] of text.matchAll(/const (\w+) = \(content\b[^)]*\) =>/g)) {
			const calls = new RegExp(`(^|[^\\w.])${helper}\\(([^()]*)\\)`, 'g');
			for (const [, , argument] of text.matchAll(calls)) {
				const variable = /^\s*(\w+)/.exec(argument)?.[1];
				const bound = variable === undefined ? undefined : bindings.get(variable);
				contentTools.push(...(bound?.tools ?? toolsNamedIn(argument)));
			}
		}

		// A direct reference to a node, then the result and a field, in the same expression.
		for (const [, name, field] of text.matchAll(
			/\$\('([^']+)'\)(?:(?!\$\()[^;]){0,200}?structuredContent\??\.(\w+)/g,
		)) {
			const tool = toolOfNode.get(name);
			if (tool) record(node.name, [tool], field);
		}
		// The input of the node, then the result and a field.
		for (const [, field] of text.matchAll(
			/\$(?:json|input\.first\(\)\.json)\??\.structuredContent\??\.(\w+)/g,
		)) {
			record(node.name, upstreamToolsOf(node.name), field);
		}
		// A variable, or a parameter of a helper, followed by a field. The field is a result when
		// the variable holds one, or when the access goes through "structuredContent".
		for (const [, variable, throughResult, field] of text.matchAll(
			/(?<![\w.$])(\w+)\??\.(structuredContent\??\.)?(\w+)/g,
		)) {
			if (field === 'structuredContent') continue;
			const bound = bindings.get(variable);
			if (bound) {
				if (throughResult || bound.holdsResult) record(node.name, bound.tools, field);
			} else if (variable === 'content') {
				record(node.name, contentTools, field);
			} else if (throughResult) {
				record(node.name, sourcesOf(node.name, text), field);
			}
		}
	}
	return reads;
}

describe('MCP tool calls', () => {
	const mcpToolNames = mcpNodes.map((node) => toolOf(node.name));

	it('documents the four proposed tools', () => {
		expect([...toolTable.keys()]).toEqual([
			'coding_prepare',
			'coding_check',
			'coding_diff',
			'coding_push',
		]);
		expect(new Set(mcpToolNames)).toEqual(new Set(toolTable.keys()));
	});

	it.each(mcpNodes.map((node) => node.name))('%s sends the input that the README shows', (name) => {
		const input = inputOf(name);

		expect(Object.keys(input)).toEqual(toolTable.get(toolOf(name))?.input);
		expect(input).toMatchObject({
			agentId: AGENT_IDS.implementer,
			session: 'factory-1234-implement',
		});
	});

	it('works on the branch of the run and runs the failing test', () => {
		const branch = { branch: ticketOutput.branch };
		const testCommand = failingTestOutput.structuredOutput.runCommand;

		expect(inputOf('Prepare workspace')).toMatchObject({ ...branch, baseBranch: 'master' });
		expect(inputOf('Push branch')).toMatchObject({
			...branch,
			message: 'ENG-42: Show the run count',
			expectedDiffSha256: DIFF_SHA256,
		});
		expect(inputOf('Verify')).toMatchObject({ testCommand });
		expect(inputOf('Re-verify')).toMatchObject({ testCommand });
	});

	it('names in the tool table each result field that each node reads from that tool', () => {
		const reads = readsOf();
		const documented = (tool: string) => resultFieldsOf(toolTable.get(tool)?.result ?? '');
		const undocumented = reads
			.filter(({ tools, field }) => !tools.some((tool) => documented(tool).has(field)))
			.map(({ node, tools, field }) => `${node} reads ${field} from ${tools.join(' or ')}`);

		// The check would pass with no reads at all, so the reads must be found.
		expect(reads.length).toBeGreaterThan(20);
		expect(new Set(reads.flatMap(({ tools }) => tools))).toEqual(new Set(toolTable.keys()));
		expect(undocumented).toEqual([]);
	});

	it('reads the change and its hash from the diff, which the tool table names as results', () => {
		const diffResults = resultFieldsOf(toolTable.get('coding_diff')?.result ?? '');

		expect([...diffResults]).toEqual(
			expect.arrayContaining(['diff', 'diffSha256', 'truncated', 'changes']),
		);
	});
});
