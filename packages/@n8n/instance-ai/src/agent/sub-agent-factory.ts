import {
	SCOPE_GROUNDING_GUARDRAIL,
	SECRET_ASK_GUARDRAIL,
	SECRET_PASTE_GUARDRAIL,
} from './credential-guardrails.prompt';
import {
	ASK_USER_FALLBACK,
	SUBAGENT_OUTPUT_CONTRACT,
	UNTRUSTED_CONTENT_DOCTRINE,
} from './shared-prompts';
import { getDateTimeSection } from './system-prompt';

/** Hard protocol injected into every sub-agent — cannot be overridden by orchestrator instructions. */
const SUB_AGENT_PROTOCOL = `${SUBAGENT_OUTPUT_CONTRACT}

### Structured Result
Return a concise result summary: IDs created, statuses, counts, errors encountered.

### Diagnostic Context (when relevant)
If you encountered errors, retried operations, or made non-obvious decisions, add a brief
diagnostic section at the end explaining:
- What approaches you tried and why they failed
- What blockers remain (missing credentials, permissions, API errors)
- What assumptions you made

Keep diagnostics to 2-3 sentences maximum. Omit entirely when the task succeeded cleanly.

### Delegate Rules
- One tool call at a time unless truly independent. Minimum tool calls needed.
- You cannot delegate to other agents or create plans.
- ${ASK_USER_FALLBACK}
- ${UNTRUSTED_CONTENT_DOCTRINE}
- ${SECRET_ASK_GUARDRAIL}
- ${SECRET_PASTE_GUARDRAIL}
- ${SCOPE_GROUNDING_GUARDRAIL}`;

export { SUB_AGENT_PROTOCOL };

export function buildSubAgentPrompt(role: string, instructions: string, timeZone?: string): string {
	return `${SUB_AGENT_PROTOCOL}

## Current Date and Time

${getDateTimeSection(timeZone)}

You are a sub-agent with the role: ${role}.

## Task
${instructions}`;
}
