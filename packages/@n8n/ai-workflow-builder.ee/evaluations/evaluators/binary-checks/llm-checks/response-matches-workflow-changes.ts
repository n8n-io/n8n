import { SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';

import { runWithOptionalLimiter, withTimeout } from '../../../harness/evaluation-helpers';
import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';
import { binaryJudgeResultSchema, type BinaryJudgeResult } from './schemas';

const REASONING_FIRST_SUFFIX = `

IMPORTANT: Write your full reasoning FIRST. Only AFTER completing your analysis, decide on pass or fail based on what you wrote. Do not decide pass/fail before reasoning.`;

const SYSTEM_PROMPT = `You are a strict evaluator checking whether an AI assistant's text response accurately describes the changes it made to an n8n workflow.

You are given:
- The workflow BEFORE the agent's turn (may be empty for new workflows)
- The workflow AFTER the agent's turn
- The agent's text response describing what it did

Your task:
1. Read the agent's text response and identify all claims about workflow changes (e.g., "I added a Slack node", "I configured the HTTP Request node to use POST method", "I connected the trigger to the filter node").
2. Compare the before and after workflow JSONs to determine what actually changed.
3. Verify each claim against the actual diff between before and after workflows.
4. Pass ONLY if every claim the agent makes is reflected in the actual changes.

Rules:
- If the agent claims to have added a node, that node must be in the AFTER workflow but NOT in the BEFORE workflow (or be newly configured).
- If the agent claims a specific configuration change, verify it differs between before and after.
- If the agent claims connections between nodes, verify those connections exist in the AFTER workflow.
- Ignore general/vague statements that don't make specific claims (e.g., "I built a workflow for you").
- If the agent's response contains NO specific claims about workflow changes, pass (nothing to verify).
- A single verifiably false claim means fail.${REASONING_FIRST_SUFFIX}`;

const HUMAN_TEMPLATE = `User Request: {userPrompt}

Agent's Text Response:
{agentTextResponse}

Workflow BEFORE agent's turn:
{workflowBefore}

Workflow AFTER agent's turn:
{workflowAfter}

Compare the before and after workflows, then verify each specific claim the agent makes. If there are no specific claims, pass.`;

export const responseMatchesWorkflowChanges: BinaryCheck = {
	name: 'response_matches_workflow_changes',
	kind: 'llm',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		if (!ctx.llm) {
			return { pass: true, comment: 'Skipped: no LLM provided' };
		}
		const { agentTextResponse } = ctx;
		if (!agentTextResponse) {
			return { pass: true, comment: 'Skipped: no agent text response available' };
		}

		const workflowBefore = ctx.existingWorkflow
			? JSON.stringify(ctx.existingWorkflow, null, 2)
			: '{"nodes": [], "connections": {}}';

		const chatPrompt = ChatPromptTemplate.fromMessages([
			new SystemMessage(SYSTEM_PROMPT),
			HumanMessagePromptTemplate.fromTemplate(HUMAN_TEMPLATE),
		]);
		const llmWithStructuredOutput =
			ctx.llm.withStructuredOutput<BinaryJudgeResult>(binaryJudgeResultSchema);
		const chain = RunnableSequence.from<
			{
				userPrompt: string;
				agentTextResponse: string;
				workflowBefore: string;
				workflowAfter: string;
			},
			BinaryJudgeResult
		>([chatPrompt, llmWithStructuredOutput]);

		const result = await runWithOptionalLimiter(async () => {
			return await withTimeout({
				promise: chain.invoke({
					userPrompt: ctx.prompt,
					agentTextResponse,
					workflowBefore,
					workflowAfter: JSON.stringify(workflow, null, 2),
				}),
				timeoutMs: ctx.timeoutMs,
				label: 'binary-checks:response_matches_workflow_changes',
			});
		}, ctx.llmCallLimiter);

		return { pass: result.pass, comment: result.reasoning };
	},
};
