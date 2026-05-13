/**
 * Specialist agent — executes ONE checklist item with a clean context.
 *
 * Inputs (no chat history, no raw user message):
 *   - The single item to do (with any user feedback hoisted to the top)
 *   - A summary of nodes already placed (name + type)
 *   - The intent brief (one paragraph, for tone-matching only)
 *
 * Tools: draft mutation tools (add_node, set_node_params, connect, ...) +
 * node-info tools (search_nodes, search_sub_nodes, get_node_type, ...).
 *
 * Output: structured `{ confidence, rationale, notes? }` so the executor
 * can decide whether to surface a check-in to the user.
 */

import { Agent } from '@n8n/agents';
import type { IncChecklistItem } from '@n8n/api-types';
import { z } from 'zod';

import type { DraftStore } from '../draft-store';
import type { NodeContext } from '../node-context';
import { createDraftTools } from '../tools/draft-tools';
import { createNodeInfoTools } from '../tools/node-info-tools';

const specialistOutputSchema = z.object({
	confidence: z.enum(['high', 'medium', 'low']),
	rationale: z.string().describe('One sentence: why this confidence level'),
	notes: z.string().optional(),
	userCheckIn: z
		.object({
			question: z
				.string()
				.describe('A specific question that references the actual decision you made on this step.'),
			options: z
				.array(
					z.object({
						label: z
							.string()
							.describe(
								'Option text the user clicks. Mark exactly one option as recommended by appending " (Recommended)" to its label.',
							),
					}),
				)
				.min(2)
				.max(4),
		})
		.optional()
		.describe(
			'REQUIRED when confidence is "medium" or "low". The executor surfaces this question and these options to the user verbatim — do NOT use generic wording. Tie them to the specific node / param / value you chose.',
		),
});

export type SpecialistOutput = z.infer<typeof specialistOutputSchema>;

const SYSTEM_PROMPT = `You are an n8n workflow specialist. You will be given
ONE step to complete on an existing draft workflow. Your job:

1. Discover the right node:
   • For triggers / integrations / utilities → search_nodes
   • For sub-nodes that plug into an AI Agent (Chat Model, Memory, Tool,
     Output Parser, Vector Store, ...) → search_sub_nodes with the matching
     ai_* connectionType.
2. If the chosen node has resources / operations / modes → call
   list_node_discriminators first, then get_node_type with the chosen
   resource + operation to receive a precise parameter schema.
3. Add the node and set its parameters with add_node / set_node_params.
   IMPORTANT: those tools return \`validationIssues\` when the node fails
   the editor's parameter check. When you see issues:
     • Read \`validationGuidance\` for a human-readable list of problems.
     • Call set_node_params again with corrected values.
     • Repeat until validationIssues disappears (max 3 retries per step).
   Do NOT continue to the next step while validationIssues is present.
4. Wire the node up if the step calls for connections (connect). Use the
   matching ai_* port when attaching language models / memory / tools to an
   AI Agent or Chain node — never use "main" for those.

You only see this one step. You do not see chat history. Trust the
intent string and the list of existing nodes.

Always finish with a single structured-output JSON returning your confidence.
The user is watching the canvas grow and we WANT to involve them. Bias
toward surfacing decisions — silent "high" runs are reserved for the
narrow cases below.

- "high"   — Reserved. ALL of these must be true:
              • the step explicitly named the node type and provided every
                required parameter value, OR
              • there is genuinely only one valid n8n node for the intent
                (e.g. "Manual Trigger" when the user said "manual trigger").
              AND validationIssues was clean on first try.
- "medium" — DEFAULT for anything you had to decide on the user's behalf:
              picked one service among several plausible ones, filled in a
              default value, chose a credential type, named the destination,
              guessed a schedule cadence, etc. Be honest — most steps land
              here.
- "low"    — You truly guessed and the workflow may not match what they
              want:
              • multiple node types could fit and you can't tell which
              • required params depend on user data you don't have
              • validationIssues persisted after your retries

In rationale, be specific: name the node type you picked, the key param
values you set, and the alternative(s) you considered. The user reads this
verbatim — vague rationale ("added a node") wastes their time.

Authoring the user check-in (REQUIRED on "medium" and "low"):

When your confidence is NOT "high", you MUST also fill the userCheckIn
field. The executor surfaces your question and options to the user
verbatim — there is NO fallback wording. If you skip this, the user gets
no check-in for a decision they should have a say in.

Rules for userCheckIn:
- The question must reference the specific decision you just made (the
  exact node, service, value, or wiring). Never write a generic question
  like "Does this look right?" or "How should I continue?".
- The question MUST be open-ended ("Which …", "Where …", "What …",
  "How often …"). NEVER write yes/no questions, NEVER start with "Is",
  "Did", "Should". We do not want the user defaulting to "yes" — we want
  them comparing alternatives.
- Provide 2-4 options grounded in real alternatives. Each option must be
  a concrete choice the user can pick ("Watch the inbox for new mail",
  "Trigger on label applied", "Switch from Gmail to Outlook"). Every
  option should be a viable answer to the question — not a "yes" / "no"
  framing of the same choice.
- Append " (Recommended)" to EXACTLY ONE option label — the one that
  matches what you actually did, or the safest path forward.
- Do not include a generic "looks good" or "redo" option — the executor
  adds keep/redo/abort affordances around your options on its own. Your
  options should be SPECIFIC alternatives the user can pick to steer the
  build.

Example, when you picked "Gmail Trigger" watching the inbox but the user
said only "send me email notifications" (so the event is ambiguous):
  question: "Which Gmail event should kick this workflow off?"
  options:
    - "Watch the inbox for new mail (Recommended)"
    - "Trigger when a label is applied to a message"
    - "Trigger when a message is starred"
    - "Switch from Gmail to Outlook altogether"`;

export interface SpecialistContext {
	item: IncChecklistItem;
	intentBrief: string;
	priorNodes: Array<{ name: string; type: string }>;
}

export interface SpecialistOptions {
	model: string;
	draft: DraftStore;
	nodeContext: NodeContext;
	context: SpecialistContext;
}

export async function runSpecialist(opts: SpecialistOptions): Promise<SpecialistOutput> {
	const draftTools = createDraftTools(opts.draft, opts.nodeContext);
	const nodeTools = createNodeInfoTools(opts.nodeContext);

	const agent = new Agent(`inc-specialist-${opts.context.item.id}`)
		.model(opts.model)
		.instructions(SYSTEM_PROMPT)
		.tool(draftTools.addNode)
		.tool(draftTools.setNodeParams)
		.tool(draftTools.connect)
		.tool(draftTools.disconnect)
		.tool(draftTools.removeNode)
		.tool(draftTools.inspectDraft)
		.tool(nodeTools.searchNodes)
		.tool(nodeTools.searchSubNodes)
		.tool(nodeTools.getNodeType)
		.tool(nodeTools.listDiscriminators)
		.structuredOutput(specialistOutputSchema);

	// User feedback (item.note) and verifier feedback (item.verifierNote) are
	// the HIGHEST-priority steering inputs. If either is present, hoist it to
	// the top of the briefing — these are the user-correction signals the
	// specialist must honor on this run.
	const overrides: string[] = [];
	if (opts.context.item.note) {
		overrides.push(
			'',
			'=== USER FEEDBACK ON THIS STEP (HIGHEST PRIORITY) ===',
			opts.context.item.note,
			'If this feedback contradicts the original intent, the feedback wins.',
			'====================================================',
		);
	}
	if (opts.context.item.verifierNote) {
		overrides.push(
			'',
			'=== VERIFIER ISSUE TO FIX ON THIS STEP ===',
			opts.context.item.verifierNote,
			'Address this issue specifically — do not just re-do the original step.',
			'==========================================',
		);
	}

	const briefing = [
		`Intent brief (for tone only): ${opts.context.intentBrief}`,
		...overrides,
		'',
		`Step to complete:`,
		`  id: ${opts.context.item.id}`,
		`  title: ${opts.context.item.title}`,
		`  intent: ${opts.context.item.intent}`,
		`  kind: ${opts.context.item.kind}`,
		opts.context.item.suggestedNodeQuery
			? `  suggestedNodeQuery: ${opts.context.item.suggestedNodeQuery}`
			: '',
		'',
		`Nodes already in the draft:`,
		opts.context.priorNodes.length === 0
			? '  (none)'
			: opts.context.priorNodes.map((n) => `  - ${n.name} (${n.type})`).join('\n'),
		'',
		'Complete this step using the tools, then return the structured-output JSON with your confidence.',
	]
		.filter((s) => s !== '')
		.join('\n');

	const result = await agent.generate(briefing);
	const parsed = (result as { structuredOutput?: SpecialistOutput }).structuredOutput;
	if (!parsed) {
		return {
			confidence: 'low',
			rationale: 'Specialist returned no structured output',
		};
	}
	return parsed;
}
