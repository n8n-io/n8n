import type { RuntimeSkill } from '@n8n/agents';

export function integrationsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-integrations',
		name: 'Agent Builder Integrations',
		description:
			'Use when deciding whether Slack, Linear, Telegram, or another external platform should be a target-agent chat integration/trigger versus a node tool, and when adding or changing schedule or chat integrations; not for built-in Build chat or Preview chat behavior.',
		instructions: `\
## Purpose

Use this to decide whether the target agent needs an entry in \`integrations\`
or a normal node/workflow tool for an external product, then configure
\`integrations\` only when the integration is the right surface.

## Boundaries

- The user is asking for Build chat or Preview chat behavior.
- The external product is only a backend API capability and the agent will be
  triggered or chatted with somewhere else; follow Tool Guidance and use node
  or workflow tools instead.
- The user only needs model, memory, or config-schema guidance.
- Built-in Preview chat does not need an \`integrations\` entry.

## Integration vs Node Tool Decision

Use an integration when the product is the agent's conversation or trigger
surface: humans will mention, message, comment to, or resume the agent there,
or the agent needs to respond in that same platform conversation context.

Use a node/workflow tool when the product is only something the agent operates
on: searching records, creating tickets, updating objects, or sending a
business-process notification while the conversation happens elsewhere.

Examples:

- Slack integration: the agent should be chatted with in Slack, respond in
  Slack threads, DM users, message channels, add reactions, or render rich UI
  to Slack users.
- Linear integration: the agent should be triggered from Linear issues/comments,
  understand the current Linear subject, or reply in the same Linear
  conversation.
- Linear node tools: the agent is triggered from Slack, Preview, schedule, or a
  workflow and only needs to search/create/update Linear tickets.

## Workflow

The \`integrations\` array controls how the target agent is triggered.

### Schedule

- One schedule integration per agent.
- Use \`{ "type": "schedule", "active": false, "cronExpression": "0 9 * * *", "wakeUpPrompt": "..." }\`.
- Keep \`active: false\`; schedules run only after publish and activation.
- Use standard 5-field cron.

### Chat Integrations

- These are connected external chat platforms, not built-in Preview chat.
- Call \`list_integration_types\` first.
- Read the returned \`capabilities\`, \`useIntegrationWhen\`, and
  \`useNodeToolWhen\` fields before deciding to add an integration.
- Pick one returned \`credentialTypes\` entry and pass it to \`ask_credential\`.
- Persist only \`type\` and \`credentialId\`; never invent credential IDs or names.
- Preserve existing schedule and chat integrations unless the user asked to remove them.

## Gotchas

- Active schedules are rejected until the agent is published; create or update schedules as inactive.
- The schedule \`wakeUpPrompt\` is the message sent when the schedule fires, not target-agent system instructions.
- Chat integration credential types must come from \`list_integration_types\`.
- Do not add a Linear integration just because the agent needs Linear issue
  CRUD. Use Linear node tools unless Linear itself is the chat/trigger context.

## Verify

- Schedule configs include \`type\`, \`active\`, \`cronExpression\`, and \`wakeUpPrompt\`.
- Connected chat integrations use a credential id returned by \`ask_credential\`.
- The chosen integration matches \`useIntegrationWhen\`; otherwise use node or
  workflow tools.
- The final \`integrations\` array keeps unrelated integrations intact.`,
	};
}
