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
			'Use when configuring inline or saved sub-agent delegation for the target agent, selecting published same-project sub-agents, or changing subAgents.maxChildren.',
		instructions: `\
## Purpose

Use this to configure how the target agent delegates focused subtasks through
\`delegate_subagent\`.

The target agent can always delegate bounded subtasks through \`delegate_subagent\`.
Do not write a flag to enable or disable delegation.

## Inline vs saved sub-agents

The target agent can call \`delegate_subagent\` with \`subAgentId: "inline"\`
without any saved-agent refs. Inline subagents are ad-hoc child agents for
one-off focused tasks.

\`subAgents.agents\` is only for optional saved/published n8n Agent specialists
that the target agent may select by id when they are a better fit than an inline
subagent.

## When to configure

- Use \`subAgents.maxChildren\` only when the user asks to limit or increase how
  many child sub-agent runs can execute at the same time.
- \`subAgents.maxChildren\` must be an integer from ${SUB_AGENT_MAX_CHILDREN_MIN} to ${SUB_AGENT_MAX_CHILDREN_MAX}. When unset, it defaults to ${SUB_AGENT_MAX_CHILDREN_DEFAULT}.
- \`subAgents.maxChildren\` limits delegate parallelism, not the total number of
  delegated tasks in a run. It is not the same as \`config.toolCallConcurrency\`.
- Do not create fields such as \`subAgents.maxConcurrentDelegations\`,
  \`delegationConcurrency\`, or \`delegateConcurrency\`.
- Add saved subagent refs only when the user asks to use specific published
  agents, reusable specialists, named helper agents, or saved-agent delegation.

## Saved sub-agent workflow

1. Call \`list_sub_agents\` to discover published same-project agents that can be
   added. Do not write agent ids from memory, prose, or user-entered free text.
2. If published agents are available and the user has not named exact agents,
   call \`ask_question\` with \`allowMultiple: true\`. Use each option's
   \`value\` as the returned \`agentId\`, and include descriptions when present.
3. If no published agents are available, do not configure saved subagents.
   Inline delegation still works without saved-agent refs.
4. Call \`read_config\`.
5. Patch selected saved agents into \`subAgents.agents\` as
   \`{ "agentId": "<returned-agent-id>" }\`. Avoid duplicates.

Example patch flow:

1. \`list_sub_agents()\`.
2. If it returns one or more agents and the user has not named exact ones, call
   \`ask_question({ allowMultiple: true, ... })\` with those agents as options.
3. \`read_config()\`.
4. \`patch_config(...)\` adding selected \`{ "agentId": "<returned-agent-id>" }\`
   refs to \`/subAgents/agents\`.

## Rules

- If the resumed values include text that is not one of the listed agent ids,
  do not persist it as an agent id; ask a follow-up.
- Do not add custom tools, custom instructions, or custom schema fields to
  simulate subagents.
- Preserve existing \`subAgents.agents\` refs unless the user explicitly asks to
  change saved subagents.

## Inline model mappings

\`subAgents.modelsByDifficulty\` is only for inline subagents. Saved subagents
keep using their own saved model and credential.

- Valid difficulty keys are only \`low\`, \`medium\`, and \`high\`.
- Each configured mapping must include both \`model\` and \`credential\`.
- Missing difficulty mappings fall back to the parent agent model at runtime.
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
- Saved refs use only returned same-project published agent ids.
- Any \`subAgents.maxChildren\` value stays within ${SUB_AGENT_MAX_CHILDREN_MIN} to ${SUB_AGENT_MAX_CHILDREN_MAX}.`,
	};
}
