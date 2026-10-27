import type { RuntimeSkill } from '@n8n/agents';
import {
	SUB_AGENT_MAX_CHILDREN_DEFAULT,
	SUB_AGENT_MAX_CHILDREN_MAX,
	SUB_AGENT_MAX_CHILDREN_MIN,
} from '@n8n/api-types';

export function subAgentsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-sub-agents',
		name: 'Agent Builder Sub-Agents',
		description:
			'Use when configuring inline or saved sub-agent delegation for target agent, selecting same-project sub-agents, or changing subAgents.maxChildren.',
		recommendedTools: [
			'agent-context',
			'agent_builder_ask_questions',
			'agent_builder_patch_config',
		],
		allowedTools: [
			'agent-context',
			'agent_builder_ask_questions',
			'agent_builder_patch_config',
			'agent_builder_write_config',
		],
		instructions: `\
## Purpose

Configure how target agent delegates focused subtasks through
\`delegate_subagent\`.

Target agent can always delegate bounded subtasks through \`delegate_subagent\`.
Do not write flag to enable or disable delegation.

## Inline vs saved sub-agents

Target agent can call \`delegate_subagent\` with \`subAgentId: "inline"\`
without any saved-agent refs. Inline subagents are ad-hoc child agents for
one-off focused tasks.

\`subAgents.agents\` is only for optional saved n8n Agent specialists that
target agent may select by id when they are better fit than inline subagent.

## When to configure

- Use \`subAgents.maxChildren\` only when user asks to limit or increase how
  many child sub-agent runs can execute at same time.
- \`subAgents.maxChildren\` must be integer from ${SUB_AGENT_MAX_CHILDREN_MIN} to ${SUB_AGENT_MAX_CHILDREN_MAX}. When unset, it defaults to ${SUB_AGENT_MAX_CHILDREN_DEFAULT}.
- \`subAgents.maxChildren\` limits delegate parallelism, not total number of
  delegated tasks in run. It is not same as \`config.toolCallConcurrency\`.
- Do not create fields such as \`subAgents.maxConcurrentDelegations\`,
  \`delegationConcurrency\`, or \`delegateConcurrency\`.
- Add saved subagent refs only when user asks to use specific agents,
  reusable specialists, named helper agents, or saved-agent delegation.

## Saved sub-agent workflow

1. Call \`agent-context({ type: "config" })\` to get target agent's id.
   Then call \`agent-context({ type: "agents" })\` to discover same-project agents.
   Exclude target id from result. Do not write agent ids
   from memory, prose, or user-entered free text.
2. If other agents are available and user has not named exact agents,
   call \`agent_builder_ask_questions({ questions: [{ type: "multi", ... }] })\` with one
   question whose \`options\`
   are returned agent names. Map each selected option back to
   matching \`agentId\` from \`agent-context({ type: "agents" })\` result.
3. If no other agents are available, do not configure saved subagents. Inline
   delegation still works without saved-agent refs.
4. Determine parent-owned routing guidance for each selected saved
   subagent. Store it as \`useWhen\`, for example
   \`{ "agentId": "<returned-agent-id>", "useWhen": "Use for billing-policy questions and invoice investigations." }\`.
5. If unclear when selected saved subagent should be used, ask user
   follow-up before patching \`subAgents.agents\`. Do not invent vague routing
   guidance.
6. Call \`agent-context({ type: "config" })\`.
7. Patch selected saved agents into \`subAgents.agents\` via \`agent_builder_patch_config\`
   as \`{ "agentId": "<returned-agent-id>", "useWhen": "Use for ..." }\` refs at
   \`/subAgents/agents\`. Avoid duplicates.

## Rules

- Saved subagents use their current draft in Preview and test sessions, and their
  published version in production sessions. Delegating to never-published agent
  fails in production, so tell user to publish saved subagents target
  agent relies on before production use.
- If resumed values include text that is not one of listed agent ids,
  do not persist it as agent id; ask follow-up.
- \`useWhen\` is relationship-specific routing guidance owned by this parent
  config. It is not child agent's global description.
- Write \`useWhen\` only when intended routing is clear from user's
  request or explicit follow-up answer.
- Every new or updated saved subagent ref must include \`useWhen\`.
- Good \`useWhen\` values are concrete and intent-oriented, such as
  "Use for invoice investigations and payment status checks."
- Do not write vague values such as "Use when helpful", "Use for tasks", or
  "Use for this agent."
- Do not add custom tools, custom instructions, or custom schema fields to
  simulate subagents.
- Preserve existing \`subAgents.agents\` refs unless user explicitly asks to
  change saved subagents. Preserve existing \`useWhen\` values when keeping refs.

## Inline model mappings

\`subAgents.modelsByDifficulty\` is only for inline subagents. Saved subagents
keep using their own saved model and credential.

- Valid difficulty keys are only \`low\`, \`medium\`, and \`high\`.
- Each configured mapping must include both \`model\` and \`credential\`.
- Missing difficulty mappings fall back to parent agent model at runtime.
- Do not add display labels, provider names, unknown difficulty keys, or extra
  fields inside difficulty mappings.

Example shape:

\`\`\`json
"subAgents": {
  "modelsByDifficulty": {
    "low": { "model": "openai/gpt-4o-mini", "credential": "credential-id" },
    "high": { "model": "anthropic/claude-sonnet-4-5", "credential": "credential-id" }
  }
}
\`\`\`

## Verify

- Inline delegation still works even when \`subAgents.agents\` is absent.
- Saved refs use only returned same-project agent ids.
- New or updated saved refs include concrete \`useWhen\` guidance.
- Any \`subAgents.maxChildren\` value stays within ${SUB_AGENT_MAX_CHILDREN_MIN} to ${SUB_AGENT_MAX_CHILDREN_MAX}.`,
	};
}
