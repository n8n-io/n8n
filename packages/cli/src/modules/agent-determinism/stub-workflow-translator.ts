import { Service } from '@n8n/di';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import { getSdkReferenceContent } from '@/modules/mcp/tools/workflow-builder/sdk-reference-content';
import { NodeTypes } from '@/node-types';

import { DRAFT_OUTPUT_NODE_NAME } from './agent-determinism.constants';
import { WorkflowTranslator, type TranslateRequest } from './agent-determinism.contracts';
import { DeterminismModelResolver } from './determinism-model.resolver';

const SAMPLE_RUNS = 5;
const MAX_SAMPLE_CHARS = 4000;
const TRANSLATE_TIMEOUT_MS = 120_000;

const RULES = `You turn repeated AI agent runs into a deterministic n8n workflow.
Rules:
- Exactly one trigger: a Webhook trigger whose body carries the run input.
- For each tool the agent called, add one node named exactly after the tool.
- Use code-decided nodes (Set, IF, Switch, Code, HTTP Request) wherever the runs show a fixed rule.
- Use an AI node only where the runs show judgement that no rule can express.
- The last node must be named "${DRAFT_OUTPUT_NODE_NAME}" and output the final answer.
- Do not add a fallback or error branch.
Return only the Workflow SDK code.`;

const outputSchema = z.object({ code: z.string() });

@Service()
export class StubWorkflowTranslator extends WorkflowTranslator {
	constructor(
		private readonly modelResolver: DeterminismModelResolver,
		private readonly nodeTypes: NodeTypes,
	) {
		super();
	}

	async translate({ actor, source, cluster, trainRuns }: TranslateRequest): Promise<WorkflowJSON> {
		const model = await this.modelResolver.resolve(actor, source.projectId);
		if (!model) throw new Error('No model credential is available in the project');

		const { Agent } = await import('@n8n/agents');
		const agent = new Agent('agent-determinism-translator')
			.model(model)
			.instructions(`${RULES}\n\n${getSdkReferenceContent()}`)
			.structuredOutput(outputSchema);

		const samples = JSON.stringify(
			trainRuns
				.slice(0, SAMPLE_RUNS)
				.map(({ input, toolCalls, output }) => ({ input, toolCalls, output })),
		).slice(0, MAX_SAMPLE_CHARS);
		const result = await agent.generate(
			`Workflow name: ${source.name}\nTool sequence: ${cluster.toolSequence.join(' -> ')}\nRecorded runs: ${samples}`,
			{ abortSignal: AbortSignal.timeout(TRANSLATE_TIMEOUT_MS) },
		);
		const { code } = outputSchema.parse(result.structuredOutput);

		const { ParseValidateHandler, stripImportStatements } = await import(
			'@n8n/ai-workflow-builder'
		);
		const handler = new ParseValidateHandler({
			generatePinData: false,
			nodeTypesProvider: this.nodeTypes,
		});
		const parsed = await handler.parseAndValidate(stripImportStatements(code));
		return parsed.workflow;
	}
}
