import type { INode } from 'n8n-workflow';
import { z } from 'zod';

import type { DiffFile } from './factory-pack-diffs';
import { loadBuiltinNodeTypes, nodeByName, readTemplateWorkflow } from './factory-pack-files';
import { TemplateRuntime, nodeTypesOf, type TemplateRun } from './factory-pack-runtime';

/** The software factory template and its runtime, shared by the template tests. */

export const workflow = readTemplateWorkflow();

export const builtinNodeTypes = loadBuiltinNodeTypes();

export const runtime = new TemplateRuntime(workflow, nodeTypesOf(builtinNodeTypes));

export const MESSAGE_AN_AGENT = 'n8n-nodes-base.messageAnAgent';
export const MCP_CLIENT = '@n8n/n8n-nodes-langchain.mcpClient';
export const PULL_REQUEST_NODE = 'Open draft PR';

export const agentNodes = (): INode[] =>
	workflow.nodes.filter((node) => node.type === MESSAGE_AN_AGENT);

export const AGENT_IDS = {
	planner: 'agent-planner',
	implementer: 'agent-implementer',
	critic: 'agent-critic',
};

const agent = (value: string) => ({ agentId: { __rl: true, mode: 'list', value } });

/** The agent of the pack that a person chooses on each Message an Agent node after import. */
export const CHOSEN_AGENTS = {
	Plan: agent(AGENT_IDS.planner),
	'Draft failing test': agent(AGENT_IDS.planner),
	Implement: agent(AGENT_IDS.implementer),
	Minimise: agent(AGENT_IDS.implementer),
	'Fresh critic': agent(AGENT_IDS.critic),
};

/** The template after import, with an agent chosen on each Message an Agent node. */
export const configured = runtime.withParameters(CHOSEN_AGENTS);

export const ticketOutput = {
	ticketId: 'issue-42',
	ticket: 'ENG-42',
	title: 'Show the run count',
	description: 'Show the number of runs.',
	url: 'https://linear.app/acme/issue/ENG-42',
	acceptanceCriteria: ['The card shows the number of runs.'],
	diffBudget: 100,
	branch: 'factory/eng-42-1234',
	runKey: 'factory-1234',
};

export const settingsOutput = {
	repositoryOwner: 'acme',
	repositoryName: 'factory',
	baseBranch: 'master',
	approvalChannel: '#factory',
	n8nMcpUrl: 'https://n8n.example.com/mcp-server/http',
	defaultDiffBudget: 400,
};

/** The failing test that the planner drafts: its path must be one of the changed files of a run. */
export const FAILING_TEST_PATH = 'packages/cli/test/unit/run-count.test.ts';

/** The failing test as a file of a change, with the one line that the planner drafts. */
export const FAILING_TEST_FILE: DiffFile = {
	path: FAILING_TEST_PATH,
	lines: ["+it('counts runs', () => {});"],
};

export const failingTestOutput = {
	structuredOutput: {
		testPath: FAILING_TEST_PATH,
		testCode: "it('counts runs', () => {});",
		runCommand: 'pnpm --filter n8n test test/unit/run-count.test.ts',
		expectedFailure: 'The count does not exist yet.',
	},
};

/** The output of the earlier nodes that most steps read. */
export const earlierNodes = {
	'Read factory ticket': ticketOutput,
	'Factory settings': settingsOutput,
	'Draft failing test': failingTestOutput,
};

export const parameterOf = (nodeName: string, parameter: string): unknown =>
	nodeByName(workflow, nodeName).parameters[parameter];

/** The value of one field of a Set node. */
export function assignmentOf(nodeName: string, field: string): unknown {
	const assignments = z
		.object({
			assignments: z.object({
				assignments: z.array(z.object({ name: z.string(), value: z.unknown() })),
			}),
		})
		.parse(nodeByName(workflow, nodeName).parameters).assignments.assignments;
	const match = assignments.find((assignment) => assignment.name === field);
	if (!match) throw new Error(`"${nodeName}" sets no field "${field}"`);
	return match.value;
}

/** A parameter value of a node as text, with each expression evaluated for the run. */
export const textOf = (nodeName: string, value: unknown, run: TemplateRun) =>
	z.string().parse(configured.evaluate(nodeName, value, run));
