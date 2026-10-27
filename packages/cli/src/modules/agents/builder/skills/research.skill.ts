import type { RuntimeSkill } from '@n8n/agents';

export function researchSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-research',
		name: 'Agent Builder Research',
		description:
			'Use when current external API, service, product, standard, or spec facts affect target-agent config, tool choices, credential choices, or instructions; not for n8n internals, local schema, or builder tool contracts.',
		instructions: `\
## Purpose

Use when external facts can change target-agent build.

## Use when

- Current external API, product, standard, or spec facts can change target-agent
  config, tool, credential, or instruction choices.
- Need to verify up-to-date endpoint, auth, or behavior details before
  build decisions.
- User explicitly asks for research that should affect target-agent
  build.

## Workflow

1. Loading this skill is not research; when current external facts affect
   build, use available research capability before relying on memory.
2. Search only for external facts that change config or implementation choice.
3. Prefer primary docs for endpoint, auth, product, or spec details.
4. Apply only verified details needed for current target-agent build.
5. If no research capability available, say so instead of filling current facts from memory.

## Gotchas

- Do not browse for n8n internals, common JavaScript or TypeScript patterns, or local schema facts.
- Do not let web result override target agent config schema or builder tool contracts.
- Do not substitute unsourced model memory for current external facts when user asked for research.
- If research does not change build, stop researching and continue from local context.

## Verify

- Config choices that depend on external facts are source-backed.
- Final config still follows local Config schema and credential rules.`,
	};
}
