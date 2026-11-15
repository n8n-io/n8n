// CONTEXT-408: the `config-evals-skill-loading` discovery scenario asks the
// Assistant to set up an evaluation on "my existing workflow" with an AI Agent.
// The failed CI trials called `list_workflows` and then `workflow_builder_ask_user`
// instead of loading `config-evals`. The runner builds the stub instance from the
// scenario, so the instance must hold the workflow that the prompt refers to.

import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { loadDiscoveryTestCasesWithFiles } from '../../data/discovery';
import { createStubServices } from '../../harness/stub-services';
import type { EventOutcome } from '../../types';
import { runExpectedToolsInvokedCheck } from '../expected-tools-invoked';
import type { DiscoveryScenario } from '../types';

const SCENARIO_ID = 'config-evals-skill-loading';
const AI_AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';

async function writeEmptyNodesJson(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(tmpdir(), 'config-evals-scenario-'));
	const file = path.join(dir, 'nodes.json');
	await fs.writeFile(file, '[]', 'utf8');
	return file;
}

describe(`${SCENARIO_ID} discovery scenario`, () => {
	it('gives the stub instance the existing AI Agent workflow that the prompt refers to', async () => {
		const [loaded] = loadDiscoveryTestCasesWithFiles(SCENARIO_ID);
		expect(loaded?.fileSlug).toBe(SCENARIO_ID);
		expect(loaded.testCase.userMessage).toContain('my existing workflow');

		// Build the stub services the same way `runOrchestratorTurn` does.
		const scenario: DiscoveryScenario = loaded.testCase;
		const { context } = await createStubServices({
			nodesJsonPath: await writeEmptyNodesJson(),
			seed: scenario.seed,
			credentials: scenario.credentials,
		});

		// What `list_workflows` returns to the Assistant during the trial.
		const { workflows } = await context.workflowService.list();
		expect(workflows.length).toBeGreaterThan(0);

		const details = await Promise.all(
			workflows.map(async ({ id }) => await context.workflowService.get(id)),
		);
		const agentWorkflows = details.filter((workflow) =>
			workflow.nodes.some((node) => node.type === AI_AGENT_NODE_TYPE),
		);
		expect(agentWorkflows.map(({ name }) => name)).not.toEqual([]);
	});

	describe('expected tool invocations', () => {
		const [{ testCase }] = loadDiscoveryTestCasesWithFiles(SCENARIO_ID);
		const skillLoad = {
			toolName: 'load_skill',
			args: { name: 'workflow-builder', filePath: 'config-evals' },
		};

		it('passes a run that loads config-evals and does not build a workflow', () => {
			const result = runExpectedToolsInvokedCheck(
				testCase,
				makeOutcome([skillLoad, { toolName: 'list_workflows' }, { toolName: 'eval-config' }]),
			);
			expect(result.pass).toBe(true);
		});

		it('fails a run that does not load config-evals', () => {
			const result = runExpectedToolsInvokedCheck(
				testCase,
				makeOutcome([
					{ toolName: 'load_skill', args: { name: 'workflow-builder' } },
					{ toolName: 'list_workflows' },
				]),
			);
			expect(result.pass).toBe(false);
		});

		// The workflow builder is the only tool that can add evaluation nodes to the canvas.
		it.each(['workflow_builder_build_workflow', 'build-workflow'])(
			'fails a run that calls %s',
			(toolName) => {
				const result = runExpectedToolsInvokedCheck(
					testCase,
					makeOutcome([skillLoad, { toolName }]),
				);
				expect(result.pass).toBe(false);
			},
		);
	});
});

function makeOutcome(toolCalls: Array<{ toolName: string; args?: Record<string, unknown> }>) {
	const outcome: EventOutcome = {
		workflowIds: [],
		executionIds: [],
		dataTableIds: [],
		artifactRefs: [],
		finalText: '',
		toolCalls: toolCalls.map(({ toolName, args }, i) => ({
			toolCallId: `call-${i}`,
			toolName,
			args: args ?? {},
			durationMs: 0,
		})),
		agentActivities: [],
	};
	return outcome;
}
