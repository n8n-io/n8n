import type { RuntimeSkill } from '@n8n/agents';

export function researchSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-research',
		name: 'Agent builder research',
		description:
			'Use when the user names an external API, service, product, standard, or spec you are unsure about.',
		instructions: `\
Use web search when external facts affect the config you are about to build.

Search when:
- The user names an API, service, product, standard, or spec you do not fully understand.
- Endpoint shapes, auth methods, parameters, or current product behavior are uncertain.
- The reference might have changed recently.

Do not search for n8n internals, common JavaScript or TypeScript patterns, or
well-known public APIs you can configure confidently from current context.`,
	};
}
