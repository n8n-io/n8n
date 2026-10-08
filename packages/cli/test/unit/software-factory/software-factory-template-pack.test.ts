import { NodeTypeParser } from '@n8n/ai-utilities/node-catalog';
import {
	AgentCodingConfigSchema,
	AgentJsonConfigBaseSchema,
	AgentJsonConfigSchema,
	CreateWorkflowPublicDto,
	N8N_CODING_DEFAULTS,
	dataTableColumnNameSchema,
	dataTableColumnTypeSchema,
	dataTableNameSchema,
	findVectorStoreToolNameCollisions,
	formatAgentConfigZodError,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { getSchemaBaseDirs, setSchemaBaseDirs, validateNodeConfig } from '@n8n/workflow-sdk';
import { jsonParse, type INode } from 'n8n-workflow';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import {
	findHttpRequestToolUrlFromAiViolations,
	validateNodeToolConfigs,
	validateNodeToolExpressions,
} from '@/modules/agents/utils/node-tool-validation';
import { resolveBuiltinNodeDefinitionDirs } from '@/utils/node-definition-dirs';

import {
	findDanglingConnections,
	findUnboundedCycles,
	findUnreachableNodes,
	findWriteAccess,
	listEdges,
	outputRunIndexLimit,
	withoutOutputs,
	type OutputSelector,
} from './factory-pack-checks';
import {
	AGENT_FILES,
	FACTORY_DIR,
	WORKFLOW_FILE,
	nodeByName,
	readPackJson,
	readPackText,
	type AgentFile,
} from './factory-pack-files';
import {
	PULL_REQUEST_NODE,
	agentNodes,
	builtinNodeTypes,
	runtime,
	ticketOutput,
	workflow,
} from './factory-pack-fixtures';

const MAX_RETRIES = 3;
/** Message an Agent stores `workflow:project-<36-char id>:<session key>` in a 128-char column. */
const SESSION_KEY_MAX_LENGTH = 74;

const nodeTypeParser = new NodeTypeParser(builtinNodeTypes);

const isTrigger = (node: INode) =>
	nodeTypeParser.getLeanNodeType(node.type, node.typeVersion)?.group.includes('trigger') ?? false;

/** A person in the loop (send-and-wait) or a `$runIndex` limit of at most 3 bounds a loop. */
const isLoopBound: OutputSelector = (source, outputIndex) => {
	const node = nodeByName(workflow, source);
	if (node.parameters.operation === 'sendAndWait') return true;
	const limit = outputRunIndexLimit(node, outputIndex);
	return limit !== undefined && limit <= MAX_RETRIES;
};

const reachesPullRequest = (drop: OutputSelector) => {
	const connections = withoutOutputs(workflow.connections, drop);
	return !findUnreachableNodes({ nodes: workflow.nodes, connections }, isTrigger).includes(
		PULL_REQUEST_NODE,
	);
};

function sessionKeyOf(node: INode): string {
	const advanced: unknown = node.parameters.advanced;
	const session = isRecord(advanced) && isRecord(advanced.session) ? advanced.session.session : {};
	const parsed = z.object({ sessionIdType: z.literal('customKey'), sessionKey: z.string() });
	return parsed.parse(session).sessionKey;
}

function assignmentsOf(node: INode) {
	return z
		.object({
			assignments: z.object({
				assignments: z.array(z.object({ name: z.string(), value: z.unknown(), type: z.string() })),
			}),
			includeOtherFields: z.boolean().optional(),
		})
		.parse(node.parameters);
}

/** Calls of `$('<name>')` in a parameter value, with the method and the arguments after them. */
function nodeReferences(value: unknown) {
	return [...JSON.stringify(value).matchAll(/\$\('([^']+)'\)(?:\.(\w+)(\(\))?)?/g)].map(
		([, name, method, noArguments]) => ({ name, method, noArguments: noArguments !== undefined }),
	);
}

const referencedNodes = (value: unknown) => nodeReferences(value).map(({ name }) => name);

function readAgent(file: AgentFile): AgentJsonConfig {
	return AgentJsonConfigSchema.parse(readPackJson(file));
}

describe('software factory template pack', () => {
	describe('workflow', () => {
		it('is a valid body for the public API that creates workflows', () => {
			const result = CreateWorkflowPublicDto.safeParse(readPackJson(WORKFLOW_FILE));

			expect(result.success ? [] : result.error.issues).toEqual([]);
			expect(workflow.settings.executionOrder).toBe('v1');
		});

		it('uses only node types and versions that exist in this repository', () => {
			const unknown = workflow.nodes
				.filter((node) => nodeTypeParser.getLeanNodeType(node.type, node.typeVersion) === null)
				.map((node) => `${node.name}: ${node.type}@${node.typeVersion}`);

			expect(unknown).toEqual([]);
		});

		it('gives every node parameters that match its node definition', () => {
			const dirs = resolveBuiltinNodeDefinitionDirs();
			if (dirs.join('\n') !== getSchemaBaseDirs().join('\n')) setSchemaBaseDirs(dirs);
			expect(dirs).toHaveLength(2);

			const invalid = workflow.nodes.flatMap((node) => {
				const result = validateNodeConfig(node.type, node.typeVersion, {
					parameters: node.parameters,
				});
				return result.valid ? [] : [`${node.name}: ${JSON.stringify(result.errors)}`];
			});

			expect(invalid).toEqual([]);
		});

		it('keeps every parameter when n8n loads the workflow', () => {
			// n8n drops parameters that its node definition does not show for the other values.
			for (const node of workflow.nodes) {
				expect(runtime.parametersOf(node.name)).toMatchObject(node.parameters);
			}
		});

		it('connects only nodes that exist', () => {
			expect(findDanglingConnections(workflow)).toEqual([]);
		});

		it('starts from one Linear trigger that reaches every node', () => {
			const triggers = workflow.nodes.filter(isTrigger);

			expect(triggers.map((node) => node.type)).toEqual(['n8n-nodes-base.linearTrigger']);
			expect(triggers[0].parameters.resources).toEqual(['issue']);
			expect(findUnreachableNodes(workflow, isTrigger)).toEqual([]);
		});

		it('has unique node names and ids', () => {
			const names = workflow.nodes.map((node) => node.name);
			const ids = workflow.nodes.map((node) => node.id);

			expect(new Set(names).size).toBe(names.length);
			expect(new Set(ids).size).toBe(ids.length);
		});

		it('names the credentials it needs, without ids from another instance', () => {
			const credentials = workflow.nodes.flatMap((node) =>
				Object.entries(node.credentials ?? {}).map(([type, value]) => `${type}: ${value.name}`),
			);

			expect(new Set(credentials)).toEqual(
				new Set([
					'linearApi: Linear account',
					'slackApi: Slack account',
					'githubApi: GitHub account',
					'httpBearerAuth: n8n MCP access token',
				]),
			);
		});

		it('names other nodes only with fixed names, so that renaming a node updates them', () => {
			const dynamic = workflow.nodes.filter((node) =>
				/\$\((?!'|\\")/.test(JSON.stringify(node.parameters)),
			);

			expect(dynamic.map((node) => node.name)).toEqual([]);
		});

		it('reads the success output of each node that it names without an output index', () => {
			// Without an index, n8n reads the output through which the reading node is connected.
			// Behind an error output, that is the error output, which is empty after a success.
			const errorOutputReads = workflow.nodes.flatMap((node) =>
				nodeReferences(node.parameters)
					.filter(({ method, noArguments }) => noArguments && ['first', 'last', 'all'].includes(method ?? ''))
					.filter(({ name }) => runtime.defaultOutputIndex(node.name, name) !== 0)
					.map(({ name }) => `${node.name} reads ${name}`),
			);

			expect(errorOutputReads).toEqual([]);
		});
	});

	describe('gates', () => {
		it('bounds every loop by a person or by at most 3 retries', () => {
			expect(findUnboundedCycles(workflow, isLoopBound)).toEqual([]);
			// Without the bounds, the plan loop and the repair loop stay.
			expect(findUnboundedCycles(workflow, () => false)).toEqual([
				['Ask for plan approval', 'Plan', 'Plan decision', 'Plan ready?', 'Revise plan'],
				[
					'Address critic findings',
					'Check result',
					'Critic input',
					'Critic verdict',
					'Fix the failing check',
					'Fresh critic',
					'Get diff',
					'Has a diff?',
					'Implement',
					'Verify',
				],
			]);
		});

		it('opens a pull request only when each gate passes', () => {
			expect(reachesPullRequest(() => false)).toBe(true);

			// A node that fails as a whole sends its input item to its success output. So each gate
			// reads the result of the step before it, and the pull request needs every gate.
			const gates = [
				'Critic is separate?',
				'Has acceptance criteria?',
				'Plan ready?',
				'Plan decision',
				'Prep ready?',
				'Check result',
				'Has a diff?',
				'Critic verdict',
				'Ready for PR?',
				'Branch pushed?',
			];
			const bypassed = gates.filter((gate) =>
				reachesPullRequest((source, index) => source === gate && index === 0),
			);

			expect(bypassed).toEqual([]);
		});

		it('opens the pull request as a draft', () => {
			expect(nodeByName(workflow, PULL_REQUEST_NODE).parameters).toMatchObject({
				resource: 'pullRequest',
				operation: 'create',
				draft: true,
			});
		});
	});

	describe('fresh critic', () => {
		const critic = nodeByName(workflow, 'Fresh critic');

		it('reads only the critic input, not the implementer conversation', () => {
			const parents = listEdges(workflow.connections).filter((edge) => edge.target === critic.name);
			const input = assignmentsOf(nodeByName(workflow, 'Critic input'));

			expect(parents.map((edge) => edge.source)).toEqual(['Critic input']);
			expect(input.includeOtherFields ?? false).toBe(false);
			expect(input.assignments.assignments.map((field) => field.name)).toEqual([
				'ticket',
				'description',
				'acceptanceCriteria',
				'plan',
				'diff',
				'check',
			]);
			expect(new Set(referencedNodes(input.assignments))).toEqual(
				new Set(['Read factory ticket', 'Plan', 'Get diff', 'Verify']),
			);
			expect(referencedNodes(critic.parameters)).toEqual(['Read factory ticket']);
		});

		it('starts a new session for each review and cannot read other nodes', () => {
			const keyAt = (node: INode, runIndex: number) =>
				runtime.evaluate(node.name, sessionKeyOf(node), {
					nodes: { 'Read factory ticket': ticketOutput },
					runIndex,
				});
			const otherKeys = agentNodes()
				.filter((node) => node !== critic)
				.map((node) => keyAt(node, 0));

			expect(keyAt(critic, 0)).toBe('factory-1234-critic-0');
			expect(keyAt(critic, 1)).toBe('factory-1234-critic-1');
			expect(otherKeys).not.toContain(keyAt(critic, 0));
			expect(critic.parameters.advanced).toMatchObject({ allowOtherNodesData: false });
		});

		it('returns a verdict, findings with path, line, severity and body, and scope creep', () => {
			const schema = z
				.object({
					required: z.array(z.string()),
					properties: z.object({
						verdict: z.object({ enum: z.array(z.string()) }),
						findings: z.object({ items: z.object({ required: z.array(z.string()) }) }),
						scopeCreep: z.object({ type: z.literal('array') }),
					}),
				})
				.parse(jsonParse(z.string().parse(critic.parameters.outputSchema)));

			expect(critic.parameters).toMatchObject({ useStructuredOutput: true, schemaType: 'manual' });
			expect(schema.required).toEqual(['verdict', 'findings', 'scopeCreep']);
			expect(schema.properties.verdict.enum).toEqual(['approve', 'request_changes', 'block']);
			expect(schema.properties.findings.items.required).toEqual([
				'path',
				'line',
				'severity',
				'body',
			]);
		});
	});

	describe('Message an Agent nodes', () => {
		it('ask a person to choose the agent of the pack that each step needs', () => {
			const choices = Object.fromEntries(
				agentNodes().map((node) => [
					node.name,
					/agents\/(\w+)\.agent\.json/.exec(node.notes ?? '')?.[1],
				]),
			);

			expect(choices).toEqual({
				Plan: 'planner',
				'Draft failing test': 'planner',
				Implement: 'implementer',
				Minimise: 'implementer',
				'Fresh critic': 'critic',
			});
			for (const node of agentNodes()) {
				expect(node.parameters.agentId).toEqual({ __rl: true, mode: 'list', value: '' });
			}
		});

		it('use session keys that fit the thread id column', () => {
			const longest = { ...ticketOutput, runKey: `factory-${'9'.repeat(20)}` };
			for (const node of agentNodes()) {
				const key = runtime.evaluate(node.name, sessionKeyOf(node), {
					nodes: { 'Read factory ticket': longest },
					runIndex: 99,
				});

				expect(z.string().max(SESSION_KEY_MAX_LENGTH).safeParse(key).success).toBe(true);
			}
		});
	});

	describe('factory_runs data table', () => {
		const create = nodeByName(workflow, 'Ensure factory_runs table');
		const insert = nodeByName(workflow, 'Record run');
		const columns = z
			.object({ column: z.array(z.object({ name: z.string(), type: z.string() })) })
			.parse(create.parameters.columns).column;
		const mapping = z
			.object({ value: z.record(z.string()), schema: z.array(z.object({ id: z.string() })) })
			.parse(insert.parameters.columns);

		it('creates the table with valid column names and types', () => {
			expect(dataTableNameSchema.safeParse(create.parameters.tableName).success).toBe(true);
			for (const column of columns) {
				expect(dataTableColumnNameSchema.safeParse(column.name).success).toBe(true);
				expect(dataTableColumnTypeSchema.safeParse(column.type).success).toBe(true);
			}
			expect(create.parameters.options).toEqual({ createIfNotExists: true });
		});

		it('inserts exactly the columns that it creates', () => {
			const names = columns.map((column) => column.name);

			expect(Object.keys(mapping.value)).toEqual(names);
			expect(mapping.schema.map((field) => field.id)).toEqual(names);
		});

		it('records the run for every outcome', () => {
			const outcomes = workflow.nodes.filter((node) => node.name.startsWith('Outcome: '));
			const edges = listEdges(workflow.connections);

			expect(outcomes).toHaveLength(9);
			for (const outcome of outcomes) {
				expect(edges).toContainEqual({
					source: outcome.name,
					type: 'main',
					outputIndex: 0,
					target: 'Run record',
				});
			}
		});
	});
});

describe('software factory agents', () => {
	it.each(AGENT_FILES)('%s passes the agent JSON config schema without unknown keys', (file) => {
		const raw = readPackJson(file);
		const result = AgentJsonConfigSchema.safeParse(raw);
		const strict = AgentJsonConfigBaseSchema.strict().safeParse(raw);

		expect(result.success ? '' : formatAgentConfigZodError(result.error)).toBe('');
		expect(strict.success ? '' : formatAgentConfigZodError(strict.error)).toBe('');
	});

	it.each(AGENT_FILES)('%s passes the checks that run when an agent is saved', async (file) => {
		const config = readAgent(file);

		expect(() => validateNodeToolExpressions(config.tools)).not.toThrow();
		expect(findHttpRequestToolUrlFromAiViolations(config.tools)).toEqual([]);
		expect(findVectorStoreToolNameCollisions(config)).toEqual([]);
		expect(await validateNodeToolConfigs(config.tools)).toBeNull();
	});

	it('gives the critic read-only tools and no memory', () => {
		const critic = readAgent('agents/critic.agent.json');

		expect(findWriteAccess(critic)).toEqual([]);
		expect(critic.mcpServers?.flatMap((server) => server.toolFilter?.tools ?? [])).toEqual([
			'get_file_contents',
			'search_code',
		]);
		expect(critic.memory?.enabled ?? false).toBe(false);
	});

	it('keeps the planner read-only', () => {
		expect(findWriteAccess(readAgent('agents/planner.agent.json'))).toEqual([]);
	});

	it('gives the implementer the n8n coding defaults', () => {
		const implementer = readAgent('agents/implementer.agent.json');
		const coding = AgentCodingConfigSchema.parse(implementer.coding);

		expect(coding).toMatchObject({
			...N8N_CODING_DEFAULTS,
			repositoryUrl: 'https://github.com/n8n-io/n8n',
		});
		expect(findWriteAccess(implementer)).toEqual(['coding lets the agent change a repository']);
	});

	it('uses three different agents', () => {
		const names = AGENT_FILES.map((file) => readAgent(file).name);

		expect(new Set(names).size).toBe(AGENT_FILES.length);
	});
});

describe('software factory README', () => {
	it('links only to files that exist', () => {
		const links = [...readPackText('README.md').matchAll(/\]\(([^)\s]+)\)/g)]
			.map((match) => match[1])
			.filter((link) => !/^(https?:|#)/.test(link));

		expect(links.length).toBeGreaterThan(5);
		expect(links.filter((link) => !existsSync(path.join(FACTORY_DIR, link)))).toEqual([]);
	});
});
