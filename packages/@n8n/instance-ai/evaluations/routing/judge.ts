// ---------------------------------------------------------------------------
// LLM judge for the routing eval.
//
// The judge watches one orchestrator turn. Before each orchestrator tool call
// runs, it reads the trace so far and decides to stop with a route or to let
// the run continue. When the turn ends first, it picks the route from the full
// trace. It never sees the user's message, so it grades what the Assistant did.
// ---------------------------------------------------------------------------

import { z } from 'zod';

import { SONNET_MODEL, createEvalAgent } from '../../src/utils/eval-agents';
import type { DiscoveryStreamStatus } from '../discovery/types';

// `reason` comes first, so the judge reasons before it picks the labels.
export const judgeVerdictSchema = z.object({
	reason: z
		.string()
		.describe('What the Assistant did, then the rules that decide the route and the steer.'),
	decision: z
		.enum(['continue', 'stop'])
		.describe('stop when the Assistant has picked a route, else continue.'),
	route: z
		.enum([
			'agent',
			'workflow',
			'one-off',
			'debug',
			'multi',
			'clarify',
			'answer',
			'decline',
			'none',
		])
		.describe('The route that the Assistant picked. Use none on continue.'),
	steer: z
		.enum(['agent', 'workflow', 'both', 'none'])
		.describe('The artifact that the Assistant pushes the user toward.'),
});

export type JudgeVerdict = z.infer<typeof judgeVerdictSchema>;
export type Route = JudgeVerdict['route'];
export type Steer = JudgeVerdict['steer'];

export type TraceStep =
	| { kind: 'text'; text: string }
	| { kind: 'call'; toolName: string; args: Record<string, unknown> };

export interface JudgeInput {
	/** The orchestrator's text and tool calls, in order. */
	steps: TraceStep[];
	/** Set when the turn has ended. The judge must then pick a route. */
	endStatus?: DiscoveryStreamStatus;
}

const MAX_ATTEMPTS = 2;
const ATTEMPT_TIMEOUT_MS = 60_000;
const MAX_STEP_CHARS = 3_000;

const SYSTEM_PROMPT = `You watch the n8n Assistant work on one user request. You do not see the request. You see what the Assistant did so far: its text and its tool calls, in order. Decide if the Assistant has picked a route.

n8n is a workflow automation product. The Assistant can build two different artifacts:

- A workflow: a trigger and a fixed graph of steps (nodes) that runs the same way each time. A workflow can contain AI steps, including an "AI Agent" node. It is still a workflow.
- An Agent: a standalone n8n Agent made with the Agent Builder. It has instructions, tools, and memory. It holds conversations or owns an ongoing role that needs judgment. It can also run scheduled tasks.

route:
- agent: The Assistant starts to build or change an Agent.
- workflow: The Assistant starts to build or change a workflow that the user keeps and that runs again later.
- one-off: The Assistant does a task once, now, and the task has an effect. For example, it runs a node or a workflow, writes or deletes data, publishes, unpublishes, or deletes a workflow, or tests a credential. A workflow that it builds only to run once is one-off. Opening a credential setup for the user is not one-off, because the user must still finish the setup.
- debug: The Assistant looks for why a run failed or gave a wrong result. It reads the executions of the run, or it reads the workflow or the Agent to find the cause.
- multi: The Assistant plans two or more separate pieces of work, for example two workflows, or an Agent and a workflow. A plan for one artifact has the route of that artifact.
- clarify: The Assistant asks the user for a decision or a missing detail and waits. It shows a question card, or its reply ends with questions that it must have answered before it continues.
- answer: The Assistant gives information, instructions, an explanation, or a result, and it needs nothing from the user to continue. An answer that ends with an optional offer ("Do you want me to build this?") is still an answer. But when the reply asks the user to pick one of the options that it lists, asks what the user wants to build or do ("What do you want to build?"), or asks for details that it needs before it builds, it is clarify.
- decline: The Assistant refuses the request, or it says that it cannot help with it. It can suggest an alternative.
- none: None of the routes above.

decision:
- continue: The Assistant only explored. Exploration is loading skills or tools, searching docs, nodes, or templates, and reading workflows, tables, credentials, or settings. Creating an empty table or adding columns is also exploration. Exploration never picks a route, even when the name of the skill, the tool, or the item names a route. Reading a workflow is not debug, unless the Assistant reads it to find why a run failed. Listing or reading credentials is not one-off.
- continue: The latest call starts work that can still end as more than one route. For example, it writes workflow code, but no call shows yet if the workflow runs once or stays.
- stop: The latest call picks a route. It starts a build, does a task with an effect, plans tasks, looks for why a run failed, or asks the user. Stop as soon as the route is clear. Do not wait for the work to finish. The route is also clear when the Assistant says what it will build or do (for example, "I'll build this as a workflow").
- When the turn has ended, stop and pick the route from all that the Assistant did and wrote. If the turn did not complete, its last text is not a reply to the user. Then pick the route from the calls and from what the Assistant said that it will build or do, or none.

steer is the artifact that the Assistant pushes the user toward:
- agent: It recommends or assumes an Agent, or its questions only make sense for an Agent (persona, tone, what the Agent remembers, where it talks to people). It does not offer a workflow as a real option.
- workflow: It recommends or assumes a workflow, or its questions are about workflow details (nodes, steps, field mappings, or which app event starts the workflow). It does not offer an Agent as a real option. A workflow with an AI Agent node is a workflow. It is also workflow when the Assistant says that it will build a workflow or lists the steps that it will build. A question about when or how often the work runs is not a workflow detail, also when one option is an app event, because an Agent can also run on a schedule.
- both: It offers an Agent and a workflow as real options, and the user can pick either one. This applies also when it marks one of them as recommended. An option where an AI keeps a conversation going with people (for example, it keeps chatting with leads or answers customers) is an Agent option.
- none: It pushes toward neither artifact. It asks about the goal or the use case without favouring one, it asks only about details that fit both (which app holds the data, which channel, when or how often the work runs, or whether to do the task once now or on a repeat), or it only answers or declines.

Rules:
- Judge what the Assistant does, not what it should do.
- The words "agent", "assistant", or "bot" alone do not decide the route or the steer. Decide from what the Assistant proposes to build.
- reason: two or three sentences. Say what the Assistant did, then name the rules that decide the route and the steer.`;

function clip(text: string): string {
	return text.length > MAX_STEP_CHARS
		? `${text.slice(0, MAX_STEP_CHARS)}… [${String(text.length - MAX_STEP_CHARS)} more characters]`
		: text;
}

export function renderJudgePrompt({ steps, endStatus }: JudgeInput): string {
	let callNumber = 0;
	const lines = steps.map((step) =>
		step.kind === 'text'
			? `Assistant text: ${clip(step.text)}`
			: `Tool call ${String(++callNumber)}: ${step.toolName} ${clip(JSON.stringify(step.args))}`,
	);
	const footer = endStatus
		? `The turn has ended (status: ${endStatus}). Stop and pick the route.`
		: 'The turn is still running. The last tool call has not run yet. Decide: stop or continue.';
	return `<trace>\n${lines.join('\n') || '(nothing)'}\n</trace>\n\n${footer}`;
}

/** Throws when no attempt returns a valid verdict. */
export async function judgeRoute(input: JudgeInput): Promise<JudgeVerdict> {
	let lastError = 'no attempt made';
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		const agent = createEvalAgent('eval-routing-judge', {
			instructions: SYSTEM_PROMPT,
			cache: true,
			model: SONNET_MODEL,
		}).structuredOutput(judgeVerdictSchema);
		try {
			const result = await agent.generate(renderJudgePrompt(input), {
				abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
			});
			const parsed = judgeVerdictSchema.safeParse(result.structuredOutput);
			if (parsed.success) return parsed.data;
			// generate() reports API failures in `result.error` instead of throwing.
			lastError =
				result.error instanceof Error
					? result.error.message
					: `no valid verdict (${JSON.stringify(result.error ?? null)})`;
		} catch (error) {
			lastError = error instanceof Error ? error.message : String(error);
		}
	}
	throw new Error(`Routing judge failed: ${lastError}`);
}
