/**
 * Planner — turns a ScopeSpec into an ordered Checklist of node-level todos.
 *
 * One structured-output call. The user is then asked to approve / edit the
 * checklist before execution starts (handled by the orchestrator using the
 * HitlBroker). When the user supplies revision feedback, the planner re-runs
 * with the feedback as the HIGHEST-priority constraint.
 */

import { Agent } from '@n8n/agents';
import type { IncChecklistItem, IncScopeSpec } from '@n8n/api-types';
import { z } from 'zod';

const plannerOutputSchema = z.object({
	items: z
		.array(
			z.object({
				id: z.string().describe('Short slug, e.g. "trigger" / "extract" / "post-slack"'),
				title: z.string(),
				intent: z.string().describe('One sentence describing what THIS step accomplishes'),
				kind: z.enum(['add-node', 'configure', 'connect', 'verify', 'note']),
				suggestedNodeQuery: z.string().optional(),
				deps: z.array(z.string()).default([]),
			}),
		)
		.min(1),
});

type PlannerOutput = z.infer<typeof plannerOutputSchema>;

const SYSTEM_PROMPT = `You plan n8n workflows. Given a ScopeSpec (trigger,
primary action, destination, constraints, intent brief) produce an ordered
checklist of node-level steps a specialist agent will execute one at a time.

Rules:
- One item per node ADDITION. Configuration belongs to that same item (the
  specialist will both add the node and set its params); use a separate
  "configure" item only if a node needs follow-up after another node exists.
- For AI Agent / LangChain assemblies, model and memory and tools are each
  their own item, with a "connect" item after the AI Agent node is added.
- ALWAYS end with one item of kind="verify" whose intent is "verify the
  workflow against the original brief".
- "deps" controls ordering — list ids of items that must complete first.
- "suggestedNodeQuery" is the keyword(s) for searching the n8n node catalog.
  Examples: "schedule trigger", "slack post message", "if", "code",
  "ai agent", "openai chat model", "buffer memory".

Keep titles short and concrete ("Add Schedule Trigger", "Post to Slack").
The intent string is what the specialist SEES — make it specific to this
step in this scope.`;

export interface PlannerOptions {
	model: string;
	scope: IncScopeSpec;
	/**
	 * If set, the user has reviewed a previous version of the plan and asked
	 * for changes. The planner MUST treat this feedback as a hard constraint
	 * that overrides anything in the ScopeSpec.
	 */
	revisionFeedback?: string;
	previousPlan?: IncChecklistItem[];
}

export async function runPlanner(opts: PlannerOptions): Promise<IncChecklistItem[]> {
	const agent = new Agent('inc-planner')
		.model(opts.model)
		.instructions(SYSTEM_PROMPT)
		.structuredOutput(plannerOutputSchema);

	const scopeBlock = `ScopeSpec:\n${JSON.stringify(opts.scope, null, 2)}`;
	let prompt = scopeBlock;

	if (opts.revisionFeedback) {
		const previous = opts.previousPlan
			? '\n\nPrevious plan you produced:\n' +
				opts.previousPlan
					.map((item, idx) => `${idx + 1}. ${item.title} — ${item.intent}`)
					.join('\n')
			: '';
		prompt =
			scopeBlock +
			previous +
			`\n\n=== USER REVISION FEEDBACK (HIGHEST PRIORITY) ===\n` +
			opts.revisionFeedback +
			`\n===============================================\n\n` +
			'Rewrite the plan to incorporate the feedback above. Keep anything the ' +
			'user did not contradict, change what they asked to change, and add any ' +
			'new steps they requested. If their feedback contradicts the ScopeSpec, ' +
			'the feedback wins. Re-emit the FULL plan including the unchanged steps.';
	}

	const result = await agent.generate(prompt);
	const parsed = (result as { structuredOutput?: PlannerOutput }).structuredOutput;
	if (!parsed) {
		throw new Error('Planner returned no structured output');
	}

	return parsed.items.map((raw) => ({
		id: raw.id,
		title: raw.title,
		intent: raw.intent,
		kind: raw.kind,
		...(raw.suggestedNodeQuery !== undefined && {
			suggestedNodeQuery: raw.suggestedNodeQuery,
		}),
		deps: raw.deps ?? [],
		status: 'pending',
	}));
}
