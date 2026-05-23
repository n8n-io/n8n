import type { RuntimeSkill } from '@n8n/agents';

export function researchSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-research',
		name: 'Agent builder research',
		description:
			'Use when current external API, service, product, standard, or spec facts affect target-agent config, tool choices, credential choices, or instructions; not for n8n internals, local schema, or builder tool contracts.',
		instructions: `\
## Purpose

Use this when external facts can change the target-agent build.

## Boundaries

- You need n8n internals, local schema, or builder-tool guidance.
- The API or service is well known enough to configure confidently from current context.
- The user is asking for a general explanation that does not affect the target agent build.

## Workflow

1. Loading this skill is not research; when current external facts affect the
   build, actually use the available provider web-search tool. In the default
   builder setup this is Anthropic's \`web_search\`.
2. Search only for the external facts that change the config or implementation choice.
3. Prefer primary docs for endpoint, auth, product, or spec details.
4. Apply only the verified details needed for the current target-agent build.
5. If no web-search tool is available, say so instead of filling current facts from memory.

## Gotchas

- Do not browse for n8n internals, common JavaScript or TypeScript patterns, or local schema facts.
- Do not let a web result override the target agent config schema or builder tool contracts.
- Do not substitute unsourced model memory for current external facts when the user asked for research.
- If research does not change the build, stop researching and continue from local context.

## Verify

- Configuration choices that depend on external facts are source-backed.
- The final config still follows the local Config schema and credential rules.`,
	};
}
