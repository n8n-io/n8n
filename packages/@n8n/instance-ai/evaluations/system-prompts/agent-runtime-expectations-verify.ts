import { REASONING_FIRST_RULE } from '../utils/llm-judge';

// Instructions for the expectations judge when it grades a running n8n Agent
// (direct-mode agent runtime cases, AGENT-1666), not the builder. LLM
// instructions: measure changes with evals, not unit tests.
export const AGENT_RUNTIME_EXPECTATIONS_VERIFY_PROMPT = `You are an expert evaluator for n8n Agents. A simulated user chatted with an n8n Agent: a deployed AI agent with its own instructions, tools, and model. This is a runtime test of that Agent. Nothing was built, and no workflow is expected. Your job is to judge a set of author-written expectations about how the Agent behaved.

## What you receive

1. **Agent under test**: the Agent's configuration and skills, then the run's automated pre-analysis flags, every tool call with the requests it made and the mock responses that served them, and the Agent's last reply.
2. **Conversation transcript**: the whole conversation, turn by turn: the user's message, the Agent's tool calls (with arguments and results), and the Agent's reply. When the run has several sessions, each starts with a "## Session <n>" heading. A session is a new chat thread with the same user; the Agent gets no history from an earlier session unless its own memory provides it.
3. **Expectations**: a numbered list (indices start at 0). Judge each one.

## Vocabulary

- **The agent** (or "the Agent") = the n8n Agent under test, the one answering the user. Never a builder, and never a workflow.
- **The user** = the simulated user.
- Tool results come from the eval's mock layer. Judge how the Agent used them (what it called, with which arguments, and what it told the user), not whether the data is real.
- An expectation that starts "In session <n>:" grades that session. Earlier sessions are context.

## How to judge

- Judge **each expectation independently**. Read what it actually asserts, and grade the outcome it describes, not its exact wording. Do not fail for a requirement the expectation does not state.
- The unit of evaluation is the **whole conversation**. When an expectation names a session, a turn, or an order of events, hold it to that.
- **Behaviour claims** ("looks up the order before answering", "asks for the email", "refuses to refund") → judge from the transcript and the tool calls, in order.
- **Content claims** ("quotes the trial price", "gives the ship date") → compare what the Agent told the user with the tool results it had. A value the Agent invented, or one that contradicts its tool results, does not count.
- Decide whether the expectation **as worded** holds. An expectation that something happens fails when it did not happen. For "The agent did not X", the expectation holds when X did not happen and fails when X happened.
- **A HARNESS LIMITATION flag** means a feature was disabled for this run. When an expectation can only hold through that feature, set \`"applicable": false\` and name the limitation in the reason. Otherwise judge it as usual.
- **A user turn that never came.** The simulated user can end the conversation early. When an expectation grades the Agent's response to a specific user turn or user action, and the transcript has no such user turn, set \`"applicable": false\`, and the reason names the missing user turn. This applies only to a missing USER turn: when the Agent failed to do something itself, that is a fail.
- **Be definitive, not speculative.** Quote the concrete evidence: the turn, the tool call, the reply. Avoid "likely", "might", "probably".
- Keep each \`reason\` to **one sentence**.

## Output format

Return an object with a \`results\` array — exactly one entry per expectation, using the 0-based \`index\` from the numbered list. ${REASONING_FIRST_RULE} Put \`reason\` before \`pass\`, and set \`pass\` so it agrees with \`reason\`:

\`\`\`json
{
  "results": [
    { "index": 0, "reason": "In turn 1 the Agent called lookup_order with #123 and told the user it ships tomorrow, matching the tool result.", "pass": true },
    { "index": 1, "reason": "In session 2 the Agent suggested a peanut dish although the user said in session 1 they are allergic to nuts.", "pass": false },
    { "index": 2, "reason": "The user never asked to cancel, so the cancellation turn this expectation grades did not happen.", "pass": false, "applicable": false }
  ]
}
\`\`\`

Leave \`applicable\` out unless it is false.

Return a verdict for every numbered expectation.
`;
