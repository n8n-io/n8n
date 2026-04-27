import { Logger } from '@n8n/backend-common';
import { evalPlanSchema } from '@n8n/api-types';
import type { EvalPlan } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { createEvalAgent, extractText } from '@n8n/instance-ai';
import { jsonParse, NodeConnectionTypes } from 'n8n-workflow';
import type { IWorkflowBase } from 'n8n-workflow';

const SYSTEM_PROMPT = `You are an evaluation designer for an n8n workflow that uses an LLM node.

You will be given a summary of one specific LLM node — its system prompt /
instructions, the tools it has access to, and the model. Your job is to design:

1. A small dataset (3-8 rows) of realistic test inputs that exercise this LLM
   node end-to-end.
2. 1-3 metric names that capture whether the LLM produced a good result for
   each row.

You do NOT decide where to place evaluation nodes in the workflow. The
frontend wires an EvaluationTrigger before the LLM and a setMetrics node
after it; you only contribute the dataset rows and metric names.

CRITICAL formatting rules — these prevent rendering bugs in the data table:
- Every cell value MUST be a string. Numbers go in as "5" (a string), not 5.
- If the LLM consumes a structured value (a JSON array, an object), STRINGIFY
  it into ONE string for that cell. Use \`JSON.stringify\` semantics: escape
  inner quotes as \\", embed the whole thing as a single string value. The
  data table will store it as a string; the LLM at runtime can parse it back
  itself if it needs to.
- Do NOT nest objects or arrays as cell values. The schema rejects them.

Rules for dataset rows:
- Keys should match what the LLM consumes (the summary tells you the input
  field hint). Use simple identifiers (e.g. "input", "chatInput", "question",
  "email_body").
- Cover happy path AND edge cases tied to the LLM's role and the user's intent.

Rules for metrics:
- Metric \`name\` is a short snake_case identifier (e.g. "answer_quality",
  "classification_accuracy", "tool_used_correctly").
- Metric \`description\` is a short sentence the user will see in the UI.

Respond with a single JSON object. NO prose, NO markdown, NO code fences.
Shape:
{
  "datasetRows": [
    { "<key>": "<string value>", ... },
    ...
  ],
  "metrics": [
    { "name": "<snake_case>", "description": "<short sentence>" },
    ...
  ]
}`;

const MAX_OUTPUT_TOKENS = 4096;

const emptyPlan = (): EvalPlan => ({ datasetRows: [], metrics: [] });

interface LlmNodeSummary {
	name: string;
	type: string;
	systemPrompt: string;
	inputHint: string;
	tools: Array<{ name: string; type: string }>;
}

@Service()
export class EvalPlanService {
	constructor(private readonly logger: Logger) {}

	async generatePlan(
		workflow: IWorkflowBase,
		llmNodeName: string,
		userIntent: string | undefined,
	): Promise<EvalPlan> {
		try {
			const summary = this.summarizeLlmNode(workflow, llmNodeName);
			if (!summary) {
				this.logger.warn('eval-plan: LLM node not found in workflow', { llmNodeName });
				return emptyPlan();
			}

			const agent = createEvalAgent('eval-plan-wizard', { instructions: SYSTEM_PROMPT });
			const userPrompt = this.buildUserPrompt(summary, userIntent);
			const result = await agent.generate(userPrompt, {
				providerOptions: { anthropic: { maxTokens: MAX_OUTPUT_TOKENS } },
			});
			const rawText = extractText(result);

			if (!rawText) {
				this.logger.warn('eval-plan agent returned no text');
				return emptyPlan();
			}

			const cleaned = rawText
				.replace(/^```(?:json)?\s*\n?/i, '')
				.replace(/\n?\s*```\s*$/i, '')
				.trim();

			let parsed: unknown;
			try {
				parsed = jsonParse(cleaned);
			} catch (error) {
				this.logger.warn('eval-plan agent JSON failed to parse', {
					error,
					inputPreview: cleaned.slice(0, 500),
				});
				return emptyPlan();
			}

			const validated = evalPlanSchema.safeParse(parsed);
			if (!validated.success) {
				this.logger.warn('eval-plan output failed schema validation', {
					error: validated.error.flatten(),
					inputPreview: cleaned.slice(0, 500),
				});
				return emptyPlan();
			}

			if (validated.data.datasetRows.length === 0) {
				this.logger.warn('eval-plan agent produced an empty dataset');
				return emptyPlan();
			}

			return validated.data;
		} catch (error) {
			this.logger.warn('eval-plan generation failed', { error });
			return emptyPlan();
		}
	}

	private buildUserPrompt(summary: LlmNodeSummary, userIntent: string | undefined): string {
		return [
			`LLM node: "${summary.name}" (type: ${summary.type})`,
			'',
			'System prompt / instructions:',
			summary.systemPrompt || '(none)',
			'',
			summary.tools.length > 0
				? `Tools available to this LLM:\n${summary.tools.map((t) => `- ${t.name} (${t.type})`).join('\n')}`
				: 'Tools available to this LLM: (none)',
			'',
			`Hint about expected input field: ${summary.inputHint}`,
			'',
			userIntent && userIntent.trim().length > 0
				? `User intent (extra guidance):\n${userIntent.trim()}`
				: 'User intent: (none — use the LLM summary alone)',
			'',
			'Generate the evaluation plan.',
		].join('\n');
	}

	private summarizeLlmNode(
		workflow: IWorkflowBase,
		llmNodeName: string,
	): LlmNodeSummary | undefined {
		const node = workflow.nodes.find((n) => n.name === llmNodeName);
		if (!node) return undefined;

		const params = (node.parameters ?? {}) as Record<string, unknown>;
		const systemPrompt = pickSystemPrompt(params);
		const inputHint = pickInputHint(params);

		const tools: Array<{ name: string; type: string }> = [];
		for (const [sourceName, byType] of Object.entries(workflow.connections ?? {})) {
			const aiToolSlots = byType?.[NodeConnectionTypes.AiTool];
			if (!aiToolSlots) continue;
			const targetsThisLlm = aiToolSlots.flat().some((c) => c?.node === llmNodeName);
			if (!targetsThisLlm) continue;
			const toolNode = workflow.nodes.find((n) => n.name === sourceName);
			if (toolNode) tools.push({ name: toolNode.name, type: toolNode.type });
		}

		return {
			name: node.name,
			type: node.type,
			systemPrompt,
			inputHint,
			tools,
		};
	}
}

/**
 * Extract a system-prompt-like string from common LLM-node parameter shapes.
 * Falls back to an empty string when nothing recognisable is set.
 */
function pickSystemPrompt(params: Record<string, unknown>): string {
	const options = params.options;
	if (options && typeof options === 'object') {
		const sm = (options as Record<string, unknown>).systemMessage;
		if (typeof sm === 'string' && sm.trim().length > 0) return sm;
	}
	for (const key of ['systemMessage', 'systemPrompt', 'instructions']) {
		const value = params[key];
		if (typeof value === 'string' && value.trim().length > 0) return value;
	}
	return '';
}

/**
 * Best-effort hint about what input field the LLM consumes. Surfaced to the
 * eval-planner so the dataset's row keys match what the LLM reads.
 */
function pickInputHint(params: Record<string, unknown>): string {
	const text = params.text;
	if (typeof text === 'string' && text.length > 0) {
		const refs = [...text.matchAll(/\$json\.([a-zA-Z_][a-zA-Z0-9_]*)/g)].map((m) => m[1]);
		const unique = [...new Set(refs)];
		if (unique.length > 0) {
			return `LLM reads ${unique.map((k) => `"${k}"`).join(', ')} from each row — use these as row keys`;
		}
		return 'LLM reads its main-port input directly';
	}
	return 'LLM reads its main-port input directly — pick a sensible row key';
}
