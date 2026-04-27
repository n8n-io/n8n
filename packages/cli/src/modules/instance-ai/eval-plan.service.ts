import { Logger } from '@n8n/backend-common';
import { evalPlanSchema } from '@n8n/api-types';
import type { EvalPlan } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { createEvalAgent } from '@n8n/instance-ai';
import type { IWorkflowBase } from 'n8n-workflow';

const SYSTEM_PROMPT = `You are an evaluation workflow designer for n8n.

Given a workflow and the user's intent (both supplied by the user), propose:
1. A small dataset (3-8 rows) of realistic test-case inputs for the workflow.
2. Where to place evaluation nodes — an evaluation trigger (reads the dataset),
   optional set-inputs nodes that seed parts of the workflow with row data,
   and set-metrics nodes that emit numeric scores after the workflow runs.

Rules:
- Dataset rows are free-form objects; use keys that make sense for the workflow's inputs.
- Cover diverse cases: at least one happy path and one edge case aligned to the user's intent.
- Node placements reference existing nodes by name. Use the exact names the user's workflow provides.
- placement.kind must be one of 'trigger' | 'setInputs' | 'setMetrics'.
- At least one setMetrics placement should include a numeric metric in its config.

Return ONLY the structured plan — no prose, no markdown.`;

// Response-size budget for a one-shot plan — 3-8 dataset rows + a handful of
// placements is comfortably under this. The cap is keyed under `anthropic` to
// match the default `globalConfig.instanceAi.model = 'anthropic/...'` and the
// existing eval-agent call sites (`pin-data-generator.ts`,
// `workflow-analysis.ts`). If a deployment configures a non-Anthropic model
// the cap silently goes unenforced; broaden the providerOptions object below
// when we add multi-provider support.
const MAX_OUTPUT_TOKENS = 4096;

const emptyPlan = (): EvalPlan => ({ datasetRows: [], nodePlacements: [] });

interface CompactWorkflowSummary {
	nodes: Array<{ name: string; type: string; operation?: unknown }>;
	connections: unknown;
}

@Service()
export class EvalPlanService {
	constructor(private readonly logger: Logger) {}

	/**
	 * Generate an evaluation plan for a workflow. Best-effort: any failure
	 * (LLM error, malformed output, zod validation failure) returns an empty
	 * plan so the frontend can recover by having the user adjust their intent
	 * or fall back to manual setup.
	 */
	async generatePlan(workflow: IWorkflowBase, userIntent: string): Promise<EvalPlan> {
		try {
			const agent = createEvalAgent('eval-plan-wizard', {
				instructions: SYSTEM_PROMPT,
			}).structuredOutput(evalPlanSchema);

			const userPrompt = this.buildUserPrompt(workflow, userIntent);
			const result = await agent.generate(userPrompt, {
				providerOptions: { anthropic: { maxTokens: MAX_OUTPUT_TOKENS } },
			});
			const structured = result.structuredOutput;
			if (!structured) {
				this.logger.warn('eval-plan agent returned no structured output');
				return emptyPlan();
			}

			// Defensive: the SDK enforces the schema, but we re-validate so a
			// future SDK change can't slip an unvalidated object through.
			const validated = evalPlanSchema.safeParse(structured);
			if (!validated.success) {
				this.logger.warn('eval-plan output failed schema validation', {
					error: validated.error.flatten(),
				});
				return emptyPlan();
			}
			return validated.data;
		} catch (error) {
			this.logger.warn('eval-plan generation failed', { error });
			return emptyPlan();
		}
	}

	private buildUserPrompt(workflow: IWorkflowBase, userIntent: string): string {
		const summary = this.buildWorkflowSummary(workflow);
		return [
			'Workflow summary:',
			JSON.stringify(summary, null, 2),
			'',
			'User intent:',
			userIntent,
			'',
			'Generate the evaluation plan.',
		].join('\n');
	}

	private buildWorkflowSummary(workflow: IWorkflowBase): CompactWorkflowSummary {
		return {
			nodes: workflow.nodes.map((node) => ({
				name: node.name,
				type: node.type,
				...(node.parameters?.operation !== undefined
					? { operation: node.parameters.operation }
					: {}),
			})),
			connections: workflow.connections,
		};
	}
}
