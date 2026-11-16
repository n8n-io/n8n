import type { RuntimeSkill } from '@n8n/agents';

export function humanReviewSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-human-review',
		name: 'Agent Builder Human Review',
		description:
			'Use when a user wants approval before an Agent action, a separate reviewer, approval in a connected channel, multiple reviewers, or a custom review form or workflow. Choose and configure the review method without requiring the user to name Human review.',
		recommendedToolGroups: ['agents', 'nodes', 'workflows', 'credentials'],
		instructions: `\
## Choose the review method

Follow the Human review decision rules in the parent \`agent-builder\` skill.
Use the simplest method that meets the requested review process. A tool that
only sends a notification does not enforce approval. Instructions that say
"ask first" do not replace a tool approval rule.

Reuse a matching review in \`hitlConfigurations\` before creating one. Reuse
the Agent's connected Slack, Telegram, or Discord credential for a simple
approve/reject request. Use a workflow for custom forms, conditional routing,
checks, or other review logic that the built-in channel method cannot express.
If a named platform is not a supported channel destination, use a workflow
only when its available nodes can deliver the required review experience.
Do not substitute a different platform without asking.

## Configure the destination

The instance must enable the Human review module. Do not configure this feature
when it is disabled. Do not claim that review is configured when a connection
or destination is unavailable.

Read the current Agent config and follow \`agent-builder-config\` for writes.
Store definitions in \`hitlConfigurations\` in the Agent JSON. They import and
export with the Agent. Do not create a separate configuration resource.
Use a new \`review_<nanoid>\` ID for each new definition.

- Workflow: set \`id\`, \`name\`, \`method: "workflow"\`, and \`workflowId\`.
- Channel: set \`id\`, \`name\`, \`method: "channel"\`, \`channel\`,
  \`credentialId\`, and \`recipient: { kind: "channel" | "user", id, name? }\`.
  The credential must belong to the matching connection on the Agent.
  Discord also requires \`guildId\`. Telegram requires a numeric user ID,
  and the user must first message the bot. Never use a Telegram username.
- Teams, WhatsApp, Linear, and n8n Chat are not built-in review destinations.
  Support for an Agent conversation channel does not imply review support.
- Resolve real destination IDs. Follow \`agent-builder-resource-locators\`
  when a node option lookup is needed. Never invent IDs or ask the target
  Agent to choose a stable destination at runtime. If a lookup is unavailable,
  leave that selection pending and explain what is missing.
- Use the workflow name or the platform and destination as the review name.
  Set \`nameOverridden: false\` for an automatic name. Set it to \`true\` for
  a user-selected name, and preserve that name when the destination changes.
- Omit \`expirySeconds\` for no expiry, the default. Use 3600, 86400, or
  604800 only for a requested one-hour, one-day, or one-week deadline.

## Build a custom review workflow

Follow \`workflow-builder\` to create or edit the workflow yourself. A review
workflow is an approval destination, not an Agent workflow tool. Keep the
original business action on the gated tool; the review workflow decides
whether that action may run.

Start with Agent review (\`n8n-nodes-base.agentDecisionTrigger\`). Its input
contains the proposed tool call and, when caller redaction permits, its
arguments. Respect \`argumentsRedacted\`; do not reconstruct hidden arguments
or put them in approval messages. Add the needed form, send-and-wait, routing,
or validation nodes. Use node discovery to check the available operations. Do not add a waiting operation as an inline Agent
node tool.

Return one terminal item with \`{ approved: boolean, reason?: string }\`.
Existing send-and-wait nodes can return the decision directly. The optional
Respond to agent review (\`n8n-nodes-base.agentDecisionResponse\`) node builds
the same result. Include a real review step; never use an unconditional
approval as a substitute for human review. A production Agent uses the
published review workflow. Explain any publication that remains pending.

## Attach and verify

- Set \`requireApproval: true\` on each ordinary tool that needs review.
  For MCP, set the requested category or tool permissions to
  \`"require_approval"\`. Preserve unrelated permission rules.
- Set \`approvalRoute: { type: "configuration", configurationIds: [firstReviewId, secondReviewId] }\`
  on the affected tool or MCP server. A route alone does not enable approval.
  There is no Agent-wide default destination. All ask-first tools on an MCP
  server use its route; do not change per-tool permission strings into objects.
- Order reviews as the user requests. Every review must approve before the
  tool runs. Rejection, expiry, or a failed review stops the sequence.
- A selected configuration always handles review, including in a conversation.
  The requester sees a waiting message without approval controls. The channel
  or workflow controls who can approve; this is not an n8n administrator-role
  check. Without a configuration, approval stays in the current conversation.
- Workflow callers must use Message an Agent version 4 to suspend for review.
  Scheduled tasks and workflow callers need a configured review destination
  when there is no requester to approve in chat.
- Verify that every route references an existing definition, every channel
  definition uses a connected credential and real destination, and every
  workflow definition references the intended review workflow.
- Summarize where review goes, which actions require it, and any setup left
  to finish. Do not run a real tool just to test approval delivery unless the
  user asks to test it.`,
	};
}
