import type { RuntimeSkill } from '@n8n/agents';

export function integrationsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-integrations',
		name: 'Agent builder integrations',
		description:
			'Use when adding schedule triggers or connected chat integrations to the target agent.',
		instructions: `\
The \`integrations\` array controls how the target agent is triggered.

Schedule:
- One schedule integration per agent.
- Use \`{ "type": "schedule", "active": false, "cronExpression": "0 9 * * *", "wakeUpPrompt": "..." }\`.
- Keep \`active: false\`; schedules run only after publish and activation.
- Use standard 5-field cron.

Chat integrations:
- Call \`list_integration_types\` first.
- Pick one returned \`credentialTypes\` entry and pass it to \`ask_credential\`.
- Persist only \`type\` and \`credentialId\`; never invent credential IDs or names.`,
	};
}
