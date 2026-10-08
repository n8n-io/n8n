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
	evaluateParameter,
	loadBuiltinNodeTypes,
	nodeByName,
	passesFilter,
	readPackJson,
	readPackText,
	readTemplateWorkflow,
	runCodeNode,
	type AgentFile,
	type TemplateRun,
} from './factory-pack-files';

const MAX_RETRIES = 3;
/** Message an Agent stores `workflow:project-<36-char id>:<session key>` in a 128-char column. */
const SESSION_KEY_MAX_LENGTH = 74;
const MESSAGE_AN_AGENT = 'n8n-nodes-base.messageAnAgent';
const PULL_REQUEST_NODE = 'Open draft PR';

const workflow = readTemplateWorkflow();
const nodeTypeParser = new NodeTypeParser(loadBuiltinNodeTypes());

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

const agentNodes = () => workflow.nodes.filter((node) => node.type === MESSAGE_AN_AGENT);

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

/** Node names that a parameter value reads with `$('<name>')`. */
function referencedNodes(value: unknown): string[] {
	return [...JSON.stringify(value).matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]);
}

/** The output that a Switch (rules mode) node sends an item to: a rule index or the fallback. */
function routeOf(switchName: string, run: TemplateRun): number | 'fallback' {
	const rules = z
		.object({ rules: z.object({ values: z.array(z.object({ conditions: z.unknown() })) }) })
		.parse(nodeByName(workflow, switchName).parameters).rules.values;
	const index = rules.findIndex((rule) => passesFilter(rule.conditions, run));
	return index === -1 ? 'fallback' : index;
}

const passesIf = (ifName: string, run: TemplateRun) =>
	passesFilter(nodeByName(workflow, ifName).parameters.conditions, run);

function readAgent(file: AgentFile): AgentJsonConfig {
	return AgentJsonConfigSchema.parse(readPackJson(file));
}

const ticketOutput = {
	ticketId: 'issue-42',
	ticket: 'ENG-42',
	title: 'Show the run count',
	acceptanceCriteria: ['The card shows the number of runs.'],
	diffBudget: 100,
	branch: 'factory/eng-42',
	runKey: 'factory-1234',
};

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
	});

	describe('gates', () => {
		it('bounds every loop by a person or by at most 3 retries', () => {
			expect(findUnboundedCycles(workflow, isLoopBound)).toEqual([]);
			// Without the bounds, the plan loop and the repair loop stay.
			expect(findUnboundedCycles(workflow, () => false)).toEqual([
				['Ask for plan approval', 'Plan', 'Plan decision', 'Revise plan'],
				[
					'Address critic findings',
					'Check result',
					'Critic input',
					'Critic verdict',
					'Fix the failing check',
					'Fresh critic',
					'Get diff',
					'Implement',
					'Verify',
				],
			]);
		});

		it('opens a pull request only when each gate passes', () => {
			expect(reachesPullRequest(() => false)).toBe(true);

			const gates = [
				'Has acceptance criteria?',
				'Plan decision',
				'Prep ready?',
				'Check result',
				'Critic verdict',
				'Ready for PR?',
			];
			const bypassed = gates.filter((gate) =>
				reachesPullRequest((source, index) => source === gate && index === 0),
			);

			expect(bypassed).toEqual([]);
		});

		it('needs acceptance criteria', () => {
			const run = (criteria: string[]) => ({
				json: { ...ticketOutput, acceptanceCriteria: criteria },
			});

			expect(passesIf('Has acceptance criteria?', run(['One']))).toBe(true);
			expect(passesIf('Has acceptance criteria?', run([]))).toBe(false);
		});

		it('continues after the approval only on an explicit approval', () => {
			const decide = (data?: Record<string, string>) =>
				routeOf('Plan decision', { json: data ? { data } : {} });

			expect(decide({ decision: 'Approve the plan' })).toBe(0);
			expect(decide({ decision: 'Change the plan', feedback: 'Smaller' })).toBe(1);
			expect(decide({ decision: 'Reject the ticket' })).toBe('fallback');
			// The wait time ran out: Slack resumes without a decision.
			expect(decide()).toBe('fallback');
		});

		it('starts the implementation only when the workspace and the failing test are ready', () => {
			const prep = (phase: unknown, testPath: unknown) =>
				passesIf('Prep ready?', {
					nodes: {
						'Prepare workspace': { structuredContent: { phase } },
						'Draft failing test': { structuredOutput: { testPath } },
					},
				});

			expect(prep('ready', 'packages/a/a.test.ts')).toBe(true);
			expect(prep('error', 'packages/a/a.test.ts')).toBe(false);
			expect(prep('ready', '')).toBe(false);
			expect(prep(undefined, undefined)).toBe(false);
		});

		it('retries a failed check at most 3 times and never retries a missing result', () => {
			const check = (result: unknown, runIndex: number) =>
				routeOf('Check result', { json: { structuredContent: result }, runIndex });

			expect(check({ check: 'passed' }, 3)).toBe(0);
			expect([0, 1, 2].map((runIndex) => check({ check: 'failed' }, runIndex))).toEqual([1, 1, 1]);
			expect(check({ check: 'failed' }, 3)).toBe('fallback');
			expect(check({ check: 'not_started' }, 0)).toBe('fallback');
			expect(check(undefined, 0)).toBe('fallback');
		});

		it('continues after the critic only on an explicit approval without serious findings', () => {
			const review = (
				structuredOutput: unknown,
				options: { diff?: string; runIndex?: number } = {},
			) =>
				routeOf('Critic verdict', {
					json: { structuredOutput },
					nodes: { 'Critic input': { diff: options.diff ?? 'diff --git a/a.ts b/a.ts' } },
					runIndex: options.runIndex ?? 0,
				});
			const finding = (severity: string) => ({ path: 'a.ts', line: 1, severity, body: 'Fix it' });

			expect(review({ verdict: 'approve', findings: [finding('minor')], scopeCreep: [] })).toBe(0);
			expect(review({ verdict: 'approve', findings: [finding('major')], scopeCreep: [] })).toBe(
				'fallback',
			);
			expect(review({ verdict: 'approve', findings: [finding('blocker')], scopeCreep: [] })).toBe(
				'fallback',
			);
			expect(review({ verdict: 'approve', findings: [], scopeCreep: [] }, { diff: '' })).toBe(
				'fallback',
			);
			expect(review({ verdict: 'request_changes', findings: [], scopeCreep: [] })).toBe(1);
			expect(
				review({ verdict: 'request_changes', findings: [], scopeCreep: [] }, { runIndex: 2 }),
			).toBe('fallback');
			expect(review({ verdict: 'block', findings: [], scopeCreep: [] })).toBe('fallback');
			expect(review(null)).toBe('fallback');
		});

		it('opens a pull request only for a passing change that is not empty and fits the budget', () => {
			const ready = (check: string, additions: number, deletions: number) =>
				passesIf('Ready for PR?', {
					json: { structuredContent: { check, changes: [{ path: 'a.ts', additions, deletions }] } },
					nodes: { 'Read factory ticket': ticketOutput },
				});

			expect(ready('passed', 60, 40)).toBe(true);
			expect(ready('passed', 61, 40)).toBe(false);
			expect(ready('passed', 0, 0)).toBe(false);
			expect(ready('failed', 1, 0)).toBe(false);
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
				evaluateParameter(sessionKeyOf(node), {
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

		it('sends its findings to the implementer in the review format of the coding view', () => {
			const [request] = assignmentsOf(nodeByName(workflow, 'Address critic findings')).assignments
				.assignments;
			const text = evaluateParameter(request.value, {
				json: {
					structuredOutput: {
						verdict: 'request_changes',
						findings: [{ path: 'src/a.ts', line: 12, severity: 'major', body: 'Handle null.' }],
						scopeCreep: ['Renamed b.ts'],
					},
				},
			});

			expect(text).toContain('src/a.ts:12 (new version)\n[major] Handle null.');
			expect(text).toContain('Remove this scope creep:\n- Renamed b.ts');
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
				const key = evaluateParameter(sessionKeyOf(node), {
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

			expect(outcomes).toHaveLength(7);
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

describe('software factory template code', () => {
	const codeOf = (name: string) => z.string().parse(nodeByName(workflow, name).parameters.jsCode);
	const factoryLabel = { id: 'label-factory', name: 'factory' };
	const description = [
		'Show the number of runs on the workflow card.',
		'',
		'## Acceptance criteria',
		'- The card shows the number of runs.',
		'* [ ] The number is 0 without runs.',
		'1. A unit test covers both cases.',
		'',
		'## Notes',
		'- Not a criterion.',
	].join('\n');

	const issueEvent = (
		event: Record<string, unknown> = {},
		issue: Record<string, unknown> = {},
	) => ({
		action: 'create',
		type: 'Issue',
		url: 'https://linear.app/acme/issue/ENG-42',
		data: {
			id: 'issue-42',
			identifier: 'ENG-42',
			title: 'Show the run count',
			description,
			url: 'https://linear.app/acme/issue/ENG-42/show-the-run-count',
			labels: [factoryLabel],
			...issue,
		},
		...event,
	});

	const readTicket = (event: Record<string, unknown>) =>
		runCodeNode(codeOf('Read factory ticket'), {
			nodes: { 'Linear Trigger': event, 'Factory settings': { defaultDiffBudget: 400 } },
			executionId: '1234',
		});

	const ticketItems = z.array(
		z.object({
			json: z.object({ acceptanceCriteria: z.array(z.string()), diffBudget: z.number() }),
		}),
	);

	it('starts a run for a new issue with the factory label', () => {
		expect(readTicket(issueEvent())).toEqual([
			{
				json: {
					ticketId: 'issue-42',
					ticket: 'ENG-42',
					title: 'Show the run count',
					description,
					url: 'https://linear.app/acme/issue/ENG-42/show-the-run-count',
					acceptanceCriteria: [
						'The card shows the number of runs.',
						'The number is 0 without runs.',
						'A unit test covers both cases.',
					],
					diffBudget: 400,
					branch: 'factory/eng-42',
					runKey: 'factory-1234',
				},
			},
		]);
	});

	it('starts a run when an update adds the factory label', () => {
		const event = issueEvent({ action: 'update', updatedFrom: { labelIds: ['label-other'] } });

		expect(readTicket(event)).toHaveLength(1);
	});

	it.each([
		[
			'an update that keeps the label',
			{ action: 'update', updatedFrom: { labelIds: ['label-factory'] } },
			{},
		],
		[
			'an update that does not change labels',
			{ action: 'update', updatedFrom: { title: 'Old' } },
			{},
		],
		['an issue without the label', {}, { labels: [{ id: 'label-bug', name: 'bug' }] }],
		['an issue without labels', {}, { labels: undefined }],
		['a removed issue', { action: 'remove' }, {}],
		['a comment event', { type: 'Comment' }, {}],
	])('ignores %s', (_case, event, issue) => {
		expect(readTicket(issueEvent(event, issue))).toEqual([]);
	});

	it.each([
		['no section', 'Fix the bug.\n- A list item outside a section.', []],
		['an empty section', '## Acceptance criteria\n\n## Notes\n- Not a criterion.', []],
		[
			'a bold heading',
			'**Acceptance criteria:**\n- First\n- Second\n**Out of scope**\n- Third',
			['First', 'Second'],
		],
		[
			'another heading level and checked items',
			'### ACCEPTANCE CRITERIA\n- [x] Done\n- [ ] Open',
			['Done', 'Open'],
		],
	])('reads the acceptance criteria of a description with %s', (_case, text, criteria) => {
		const [item] = ticketItems.parse(readTicket(issueEvent({}, { description: text })));

		expect(item.json.acceptanceCriteria).toEqual(criteria);
	});

	it('reads the acceptance criteria of the example ticket in the README', () => {
		const example = /```markdown\n([\s\S]*?)```/.exec(readPackText('README.md'))?.[1];
		const [item] = ticketItems.parse(readTicket(issueEvent({}, { description: example })));

		expect(item.json.acceptanceCriteria).toEqual([
			'The workflow card shows the number of runs in the last 7 days.',
			'The number is 0 for a workflow without runs.',
			'A unit test covers both cases.',
		]);
	});

	it.each([
		['budget:150', 150],
		['Budget:75', 75],
		['budget:0', 400],
		['budget:many', 400],
	])('takes the diff budget from the label %s', (name, budget) => {
		const labels = [factoryLabel, { id: 'label-budget', name }];
		const [item] = ticketItems.parse(readTicket(issueEvent({}, { labels })));

		expect(item.json.diffBudget).toBe(budget);
	});

	const ticket = { ticket: 'ENG-42', url: 'https://linear.app/acme/issue/ENG-42' };
	const records = z.array(z.object({ json: z.record(z.unknown()) })).length(1);

	it('builds the run record from the outcome and the last check', () => {
		const changes = [
			{ path: 'a.ts', status: 'M', additions: 10, deletions: 4 },
			{ path: 'b.ts', status: 'A', additions: 6, deletions: 0 },
		];
		const [record] = records.parse(
			runCodeNode(codeOf('Run record'), {
				nodes: {
					'Read factory ticket': ticket,
					Verify: { structuredContent: { check: 'passed', changes: [{ additions: 99 }] } },
					'Re-verify': { structuredContent: { check: 'passed', changes } },
					'Fresh critic': { structuredOutput: { verdict: 'approve' } },
				},
				json: { status: 'draft_pr_opened', summary: 'Opened', prUrl: 'https://example.com/pr/1' },
				executionId: '77',
			}),
		);

		expect(record.json).toEqual({
			ticket: 'ENG-42',
			ticketUrl: ticket.url,
			status: 'draft_pr_opened',
			summary: 'Opened',
			criticVerdict: 'approve',
			linesChanged: 20,
			prUrl: 'https://example.com/pr/1',
			executionId: '77',
			finishedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
		});
	});

	it('records no changed lines and no verdict when the run stops before the check', () => {
		const [record] = records.parse(
			runCodeNode(codeOf('Run record'), {
				nodes: { 'Read factory ticket': ticket },
				json: { status: 'missing_acceptance_criteria', summary: 'No criteria' },
				executionId: '78',
			}),
		);

		expect(record.json).toMatchObject({ criticVerdict: '', linesChanged: 0, prUrl: '' });
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
