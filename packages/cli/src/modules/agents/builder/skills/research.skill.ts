import type { RuntimeSkill } from '@n8n/agents';

export function researchSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-research',
		name: 'Agent Builder Research',
		description:
			'Use when current external API, service, product, standard, or spec facts affect target-agent config, tool choices, credential choices, or instructions; not for n8n internals, local schema, or builder tool contracts.',
		instructions: `\
## Purpose

Use this when external facts can change the target-agent build.

## Use when

- Current external API, product, standard, or spec facts can change target-agent
  config, tool, credential, or instruction choices.
- You need to verify up-to-date endpoint, auth, or behavior details before
  making build decisions.
- The user explicitly asks for research that should affect the target-agent
  build.

## Workflow

1. Loading this skill is not research; when current external facts affect the
   build, use the available research capability before relying on memory.
2. Search only for the external facts that change the config or implementation choice.
3. Prefer primary docs for endpoint, auth, product, or spec details.
4. Apply only the verified details needed for the current target-agent build.
5. If no research capability is available, say so instead of filling current facts from memory.

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
