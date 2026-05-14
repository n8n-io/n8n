/**
 * Specialist agent — executes ONE checklist item with a clean context.
 *
 * Inputs (no chat history, no raw user message):
 *   - The single item to do (with any user feedback hoisted to the top)
 *   - A summary of nodes already placed (name + type)
 *   - The intent brief (one paragraph, for tone-matching only)
 *
 * Tools: draft mutation tools (add_node, set_node_params, connect, ...) +
 * node-info tools (search_nodes, search_sub_nodes, get_node_type, ...) +
 * a mandatory `report_confidence` tool that captures the structured result.
 *
 * Why `report_confidence` is a tool (not `.structuredOutput()`): when an
 * agent has BOTH tools and a structured-output schema, the LLM can satisfy
 * the schema without ever calling the tools — leaving every step at fallback
 * confidence and no nodes built. Making the result a required tool call
 * forces the agent through the proper tool-using loop.
 *
 * Every tool execution is forwarded to the SSE bus as `tool-call` /
 * `tool-result` events so the user sees the specialist's activity live.
 */

import { Agent, AgentEvent, Tool } from '@n8n/agents';
import type { AgentId, IncChecklistItem, InstanceAiEvent, RunId, ToolCallId } from '@n8n/api-types';
import { z } from 'zod';

import type { DraftStore } from '../draft-store';
import type { EventChannel } from '../event-helpers';
import type { NodeContext } from '../node-context';
import { createDraftTools } from '../tools/draft-tools';
import { createNodeInfoTools } from '../tools/node-info-tools';

const userCheckInSchema = z.object({
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
});

const reportConfidenceInputSchema = z.object({
	confidence: z.enum(['high', 'medium', 'low']),
	rationale: z.string().describe('One sentence: why this confidence level'),
	notes: z.string().optional(),
	userCheckIn: userCheckInSchema
		.optional()
		.describe(
			'REQUIRED when confidence is "medium" or "low". The executor surfaces this question and these options to the user verbatim — do NOT use generic wording. Tie them to the specific node / param / value you chose.',
		),
});

export type SpecialistOutput = z.infer<typeof reportConfidenceInputSchema>;

/** Tool names we never surface in the chat thread — they're internal plumbing. */
const HIDDEN_TOOL_NAMES = new Set(['report_confidence']);

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
   Do NOT continue while validationIssues is present.
4. Wire the node up if the step calls for connections (connect). Use the
   matching ai_* port when attaching language models / memory / tools to an
   AI Agent or Chain node — never use "main" for those.
5. FINAL STEP: call \`report_confidence\` with your assessment. This is
   MANDATORY. The run is not considered complete until you call it. If you
   cannot make progress, still call \`report_confidence\` with confidence
   "low" and explain why in the rationale.

You only see this one step. You do not see chat history. Trust the intent
string and the list of existing nodes.

You MUST actually use the tools — do not just call report_confidence
without first searching for and adding the relevant node. Calling
report_confidence with confidence "low" before attempting anything is a
failure mode the executor will surface to the user.

The user already answered intake questions and approved the plan — they
expect you to be DECISIVE. Default to "high" unless you genuinely
guessed. Reserve "low" for actually-uncertain decisions.

- "high"   — DEFAULT. Use when:
              • the step + plan unambiguously implied the node/service AND
                you used standard parameter values, OR
              • you picked the most idiomatic n8n node for the described
                intent (e.g. Slack for "post to slack", Schedule Trigger
                for "every hour"), OR
              • validationIssues was clean on first try.
              The user can override later — don't ask permission for the
              obvious choice.
- "medium" — Use sparingly: when you had a genuine 50/50 split between
              two services the user didn't disambiguate (e.g. "send
              notification" → could be Slack or email, and the brief
              doesn't lean either way) AND it materially changes the
              workflow's behaviour. Don't downgrade to medium just
              because you filled in a default param.
- "low"    — You truly guessed and the workflow may not match what they
              want:
              • multiple equally-plausible node types and no signal at all
              • required params depend on user data you don't have
              • validationIssues persisted after your retries

In rationale, be specific: name the node type you picked, the key param
values you set, and the alternative(s) you considered. The user reads this
verbatim — vague rationale ("added a node") wastes their time.

Authoring the user check-in (REQUIRED on "low" only):

When your confidence is "low", you MUST also fill the userCheckIn argument
of report_confidence. The executor surfaces your question and options to
the user verbatim — there is NO fallback wording.

On "medium" the check-in is OPTIONAL — include it only when the
alternative would genuinely change what the workflow does. Otherwise leave
it out so the build keeps moving. On "high" never include a check-in.

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
	channel: EventChannel;
	context: SpecialistContext;
}

export async function runSpecialist(opts: SpecialistOptions): Promise<SpecialistOutput> {
	const draftTools = createDraftTools(opts.draft, opts.nodeContext);
	const nodeTools = createNodeInfoTools(opts.nodeContext);

	// Capture the report_confidence call. The agent is required to call this
	// exactly once as its final action; we read it back after generate() returns.
	let capturedReport: SpecialistOutput | undefined;
	const reportConfidence = new Tool('report_confidence')
		.description(
			'MANDATORY final tool call. Report your confidence about the step you ' +
				'just completed. confidence=medium or low REQUIRES userCheckIn with a ' +
				'question and 2-4 specific options grounded in alternatives you considered.',
		)
		.input(reportConfidenceInputSchema)
		.output(z.object({ ok: z.boolean() }))
		.handler(async (input) => {
			capturedReport = input;
			return { ok: true };
		});

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
		.tool(reportConfidence);

	// Forward agent tool executions to the SSE bus so the user sees the live
	// activity. We use the orchestrator's agentId so the calls show in the
	// main thread next to the checklist row.
	type ToolStartData = {
		type: 'tool_execution_start';
		toolCallId: string;
		toolName: string;
		args: unknown;
	};
	type ToolEndData = {
		type: 'tool_execution_end';
		toolCallId: string;
		toolName: string;
		result: unknown;
		isError: boolean;
	};

	const startHandler = (data: unknown) => {
		const ev = data as ToolStartData;
		if (ev.type !== 'tool_execution_start') return;
		if (HIDDEN_TOOL_NAMES.has(ev.toolName)) return;
		const event: InstanceAiEvent = {
			type: 'tool-call',
			runId: opts.channel.runId as RunId,
			agentId: opts.channel.agentId as AgentId,
			...(opts.channel.userId !== undefined && { userId: opts.channel.userId }),
			payload: {
				toolCallId: ev.toolCallId as ToolCallId,
				toolName: ev.toolName,
				args: ev.args && typeof ev.args === 'object' ? (ev.args as Record<string, unknown>) : {},
			},
		};
		opts.channel.eventBus.publish(opts.channel.threadId, event);
	};
	const endHandler = (data: unknown) => {
		const ev = data as ToolEndData;
		if (ev.type !== 'tool_execution_end') return;
		if (HIDDEN_TOOL_NAMES.has(ev.toolName)) return;
		const baseEvent = {
			runId: opts.channel.runId as RunId,
			agentId: opts.channel.agentId as AgentId,
			...(opts.channel.userId !== undefined && { userId: opts.channel.userId }),
		};
		const event: InstanceAiEvent = ev.isError
			? {
					type: 'tool-error',
					...baseEvent,
					payload: {
						toolCallId: ev.toolCallId as ToolCallId,
						error: typeof ev.result === 'string' ? ev.result : JSON.stringify(ev.result ?? {}),
					},
				}
			: {
					type: 'tool-result',
					...baseEvent,
					payload: {
						toolCallId: ev.toolCallId as ToolCallId,
						result: ev.result,
					},
				};
		opts.channel.eventBus.publish(opts.channel.threadId, event);
	};

	agent.on(AgentEvent.ToolExecutionStart, startHandler as never);
	agent.on(AgentEvent.ToolExecutionEnd, endHandler as never);

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
		'Complete this step using the tools above, then call report_confidence ' +
			'with your assessment to finish.',
	]
		.filter((s) => s !== '')
		.join('\n');

	try {
		await agent.generate(briefing);
	} finally {
		agent.off(AgentEvent.ToolExecutionStart, startHandler as never);
		agent.off(AgentEvent.ToolExecutionEnd, endHandler as never);
		await agent.close().catch(() => undefined);
	}

	if (!capturedReport) {
		return {
			confidence: 'low',
			rationale: 'Specialist never called report_confidence — likely produced no useful output.',
		};
	}
	return capturedReport;
}
