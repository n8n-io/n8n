import type { RuntimeSkill } from '@n8n/agents';

export function integrationsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-integrations',
		name: 'Agent builder integrations',
		description:
			'Use when adding or changing target-agent schedule triggers or connected external chat-platform integrations; not for built-in Build chat or Preview chat behavior.',
		instructions: `\
## Purpose

Use this to configure entries in the target agent's \`integrations\` array.

## Boundaries

- The user is asking for Build chat or Preview chat behavior.
- The user wants an agent tool that sends messages; use the tools skill instead.
- The user only needs model, memory, or config-schema guidance.
- Built-in Preview chat does not need an \`integrations\` entry.

## Workflow

The \`integrations\` array controls how the target agent is triggered.

### Schedule

- One schedule integration per agent.
- Use \`{ "type": "schedule", "active": false, "cronExpression": "0 9 * * *", "wakeUpPrompt": "..." }\`.
- Keep \`active: false\`; schedules run only after publish and activation.
- Use standard 5-field cron.

### Chat integrations

- These are connected external chat platforms, not built-in Preview chat.
- Call \`list_integration_types\` first.
- Pick one returned \`credentialTypes\` entry and pass it to \`ask_credential\`.
- Persist only \`type\` and \`credentialId\`; never invent credential IDs or names.
- Preserve existing schedule and chat integrations unless the user asked to remove them.

## Gotchas

- Active schedules are rejected until the agent is published; create or update schedules as inactive.
- The schedule \`wakeUpPrompt\` is the message sent when the schedule fires, not target-agent system instructions.
- Chat integration credential types must come from \`list_integration_types\`.

## Verify

- Schedule configs include \`type\`, \`active\`, \`cronExpression\`, and \`wakeUpPrompt\`.
- Connected chat integrations use a credential id returned by \`ask_credential\`.
- The final \`integrations\` array keeps unrelated integrations intact.`,
	};
}
