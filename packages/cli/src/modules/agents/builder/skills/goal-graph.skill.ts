import type { RuntimeSkill } from '@n8n/agents';

/**
 * Builder skill: translate a user's desired agent behaviour into a goal graph
 * (`slots` + `goals`) that puts deterministic guardrails on the target agent.
 * Only offered when the `goal-graph` agents module is enabled.
 */
export function goalGraphSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-goal-graph',
		name: 'Agent Builder Goal Graph (Deterministic Guardrails)',
		description:
			'Use when the user wants the target agent to be constrained, gated, staged, or verifiable rather than free-form — e.g. "must verify/authenticate/approve before doing X", "don\'t let it <action> until <condition>", keeping a secret/PII/OTP/password hidden from the model, multi-step flows with prerequisites, human-in-the-loop approval before an action, or bounded retries. Produces `slots` (typed run state) and `goals` (outcomes with deterministic done-conditions and gated tools).',
		recommendedTools: ['read_config', 'ask_questions', 'patch_config', 'write_config'],
		allowedTools: ['read_config', 'ask_questions', 'patch_config', 'write_config'],
		instructions: `\
## Purpose

Put **deterministic guardrails** on the target agent with a goal graph, so it
physically cannot take an action before a condition provably holds — instead of
merely being *asked* not to in its prompt.

Two config sections do this:

- \`slots\` — typed named pieces of run state, each with an \`access\` level:
  - \`access: "standard"\` — the agent reads it and writes it (via the built-in
    \`fill_slot\` tool). Use for info the user simply states (an email).
  - \`access: "protected"\` — the agent reads it but **cannot** write it; only
    tool **outputs** can. Use for anything that must be trustworthy (a verified
    flag, an id, a counter) — the agent cannot forge it.
  - \`access: "private"\` — the agent can **neither read nor write** it; only
    tools read it (via bindings) and write it (via outputMappings). Its value
    never reaches the model yet still drives goal statuses. Use for sensitive
    data the agent must act on but never see.
- \`goals\` — outcomes with deterministic conditions over state:
  \`achievedWhen\` (done), optional \`failedWhen\`, optional \`unlockedWhen\`, and
  \`requires\` (prerequisite goal ids). A goal's attached **tools are callable
  only while that goal is ACTIVE** (its \`requires\` are all achieved). That is
  the guardrail. Goal status is a pure function of slot values, re-derived every
  step — nothing is stored.

Tool attachments carry \`bindings\` (inject a value from state into a tool input,
hidden from the model) and \`outputMappings\` (write a tool result back into a slot).

## How to turn a request into a guardrail

1. **\`read_config\` first.** Note the agent's EXACT tool names (custom tool
   names, workflow tool names, node tool names). Attachment \`tool\` values must
   match these character-for-character.
2. **Identify the gated action(s)** — what must not happen prematurely
   (extend a trial, issue a refund, send account data, change a limit).
3. **Identify the deterministic precondition** — what must be true first
   (verified, authenticated, approved, threshold met). Prefer a check that a
   **tool or sub-workflow decides**, not the agent's own judgment.
4. **Model state as slots:**
   - a \`protected\` boolean/id slot the precondition tool sets
     (e.g. \`emailVerified\`, \`customerId\`) — the agent cannot forge it;
   - \`standard\` slots for info the user provides (e.g. \`email\`);
   - a \`protected\` counter slot with \`initialValue: 0\` if you want
     bounded retries;
   - **keep secrets out of slots.** OTP codes, passwords, PII should live inside
     the deterministic tool/sub-workflow (it stores and compares them) and the
     tool should return only a boolean or an opaque handle — never the secret.
5. **Model goals:**
   - a *precondition* goal — attach the deterministic tool; \`achievedWhen\`
     reads its \`protected\`/\`private\` slot (e.g. \`={{ $state.emailVerified === true }}\`);
     add \`failedWhen\` for a retry bound if relevant.
   - each *gated-action* goal — set \`requires: ["<precondition-goal-id>"]\` and
     attach its tool. It stays LOCKED (tool hidden) until the precondition is
     achieved.
6. **Wire the attachments** — \`bindings\` for inputs that must come from state
   and stay hidden from the model; \`outputMappings\` to record results into slots.
7. **Persist** with \`patch_config\` (or \`write_config\`) into \`/slots\` and
   \`/goals\`. Preserve existing tools, instructions, and other config.

## Rules

- Every attachment \`tool\` MUST equal a real configured tool name — confirm via
  \`read_config\`. A goal that references a tool the agent doesn't have is
  rejected at save time.
- \`achievedWhen\`, \`failedWhen\`, \`unlockedWhen\`, \`bindings\`, and
  \`outputMappings\` values are n8n expressions over \`$state\` (and \`$json\`,
  the tool output, for \`outputMappings\`). Always wrap them: \`={{ ... }}\`.
- Only gate on \`protected\`/\`private\` slots. The agent can write \`standard\`
  slots, so gating on one is not a real guardrail.
- A tool the agent must not use early belongs on a \`requires\`-gated goal — never
  rely on instructions alone to hold a hard guarantee.
- \`requires\` edges must form a DAG (no cycles).
- Slot \`type\` is one of \`string\`, \`number\`, \`boolean\`, \`object\` only.
- Keep the agent's global \`instructions\` for persona and off-graph behaviour;
  put step-specific guidance in each goal's \`instructions\`.
- If the gated action, the precondition, or who deterministically decides it is
  unclear, \`ask_questions\` before writing config. Do not invent a guardrail.

## Example — "verify the customer's email before extending their trial"

\`\`\`json
{
  "slots": [
    { "name": "email", "type": "string", "access": "standard" },
    { "name": "verificationId", "type": "string", "access": "private" },
    { "name": "emailVerified", "type": "boolean", "access": "protected" },
    { "name": "verificationAttempts", "type": "number", "access": "protected", "initialValue": 0 },
    { "name": "trialExtendedUntil", "type": "string", "access": "protected" }
  ],
  "goals": [
    {
      "id": "verify_email",
      "name": "Verify the customer's email",
      "instructions": "Ask for the email and record it with fill_slot, then send a code with send_code (the system emails it — never ask for or mention the code value). Then ask the customer to paste the code and check it with verify_code.",
      "achievedWhen": "={{ $state.emailVerified === true }}",
      "failedWhen": "={{ $state.verificationAttempts >= 3 }}",
      "tools": [
        { "tool": "send_code",
          "bindings": { "email": "={{ $state.email }}" },
          "outputMappings": { "verificationId": "={{ $json.verificationId }}" } },
        { "tool": "verify_code",
          "bindings": { "verificationId": "={{ $state.verificationId }}" },
          "outputMappings": {
            "emailVerified": "={{ $json.verified }}",
            "verificationAttempts": "={{ $state.verificationAttempts + 1 }}"
          } }
      ]
    },
    {
      "id": "extend_trial",
      "name": "Extend the trial",
      "instructions": "Confirm the number of days (max 14), then call extend_trial.",
      "achievedWhen": "={{ $state.trialExtendedUntil !== null }}",
      "requires": ["verify_email"],
      "tools": [
        { "tool": "extend_trial",
          "outputMappings": { "trialExtendedUntil": "={{ $json.newTrialEnd }}" } }
      ]
    }
  ]
}
\`\`\`

Here \`extend_trial\`'s tool is unavailable until \`emailVerified\` is set true by
\`verify_code\` — a guarantee the model cannot talk its way around.

## Verify before finishing

- Every gated tool sits on a goal whose \`requires\` points at the precondition goal.
- The precondition's \`achievedWhen\` reads a \`protected\`/\`private\` slot, not a \`standard\` one.
- Every attachment \`tool\` name matches a tool actually configured on the agent.
- No secret (code, password, PII) is stored in a slot.
- \`requires\` forms a DAG.`,
	};
}
