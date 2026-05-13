/**
 * Verifier — independent check on the built workflow.
 *
 * Deliberately gets ONLY:
 *   - the intent brief (one paragraph)
 *   - the final workflow JSON
 *
 * No chat, no checklist, no specialist notes. This is the contamination
 * firewall — if the build process talked the orchestrator into a wrong
 * design, the verifier never heard that conversation, so it can flag it.
 */

import { Agent } from '@n8n/agents';
import type { IncVerifierIssue, IncVerifierReport } from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

const verifierOutputSchema = z.object({
	verdict: z.enum(['verified', 'needs_changes', 'failed']),
	summary: z.string(),
	issues: z
		.array(
			z.object({
				nodeName: z.string().optional(),
				problem: z.string(),
				severity: z.enum(['blocker', 'warning', 'info']),
				suggestedFix: z.string().optional(),
			}),
		)
		.default([]),
});

type VerifierOutput = z.infer<typeof verifierOutputSchema>;

const SYSTEM_PROMPT = `You are an independent n8n workflow auditor. You will
be given:

  1. INTENT BRIEF — one paragraph describing what the workflow needs to do.
  2. FINAL WORKFLOW — the workflow JSON the builder produced.

You did NOT see how the workflow was built. Your only job is to read the
brief, read the workflow, and decide:

- "verified"      — the workflow plausibly implements the brief.
- "needs_changes" — the workflow has fixable gaps (missing fields, wrong
                    port wiring, bad params). List each as an issue.
- "failed"        — the workflow does not implement the brief at all.

For each issue:
- "blocker" — workflow won't run or won't fulfil the brief.
- "warning" — workflow may run but result is likely wrong.
- "info"    — minor improvement (naming, optional params).

Be specific. Reference node names when you can. Don't add issues that aren't
real problems just to look thorough.`;

export interface VerifierOptions {
	model: string;
	intentBrief: string;
	workflow: WorkflowJSON;
}

export async function runVerifier(opts: VerifierOptions): Promise<IncVerifierReport> {
	const agent = new Agent('inc-verifier')
		.model(opts.model)
		.instructions(SYSTEM_PROMPT)
		.structuredOutput(verifierOutputSchema);

	const compactWorkflow = {
		name: opts.workflow.name,
		nodes: opts.workflow.nodes.map((n) => ({
			name: n.name,
			type: n.type,
			parameters: n.parameters,
		})),
		connections: opts.workflow.connections,
	};

	const prompt =
		`INTENT BRIEF:\n${opts.intentBrief}\n\n` +
		`FINAL WORKFLOW (JSON):\n${JSON.stringify(compactWorkflow, null, 2)}\n\n` +
		`Return the structured-output verdict.`;

	const result = await agent.generate(prompt);
	const parsed = (result as { structuredOutput?: VerifierOutput }).structuredOutput;
	if (!parsed) {
		return {
			verdict: 'failed',
			summary: 'Verifier returned no structured output',
			issues: [],
		};
	}

	const issues: IncVerifierIssue[] = parsed.issues.map((i) => ({
		problem: i.problem,
		severity: i.severity,
		...(i.nodeName !== undefined && { nodeName: i.nodeName }),
		...(i.suggestedFix !== undefined && { suggestedFix: i.suggestedFix }),
	}));

	return { verdict: parsed.verdict, summary: parsed.summary, issues };
}
