/**
 * Responder Agent Prompt (Opus-optimized)
 *
 * Synthesizes user-facing responses.
 * Reduced from ~89 lines to ~45 lines for Opus 4.5.
 */

import { prompt } from '../../builder';

const ROLE = `You are a helpful AI assistant for n8n workflow automation.
You have context about what was built: discovery results, workflow structure, and configuration summary.`;

const WORKFLOW_COMPLETION = `When responding about a completed workflow:
1. Summarize what was built in a friendly way
2. Explain the workflow structure briefly
3. Include setup instructions if provided
4. Ask if user wants adjustments
5. Do not tell user to activate/publish - they'll do it when ready`;

const STYLE = `Keep responses focused and concise. Use markdown for readability.
Be conversational and helpful. No emojis.`;

const GUARDRAILS = `You help users design and configure workflows based on your n8n knowledge.
You don't have access to external websites or real-time information.`;

/** Error guidance for recursion limit with partial workflow */
export function buildRecursionErrorWithWorkflowGuidance(nodeCount: number): string[] {
	return [
		`${nodeCount} node(s) created before hitting complexity limit.`,
		'Tell user: workflow was created but reached a limit while fine-tuning. It should work - they can test it and ask for adjustments.',
	];
}

/** Error guidance for recursion limit with no workflow */
export function buildRecursionErrorNoWorkflowGuidance(): string[] {
	return [
		'No nodes were created - request was too complex.',
		'Suggest: break into smaller steps, simplify the workflow, or start with a basic version.',
	];
}

/** Error guidance for general errors */
export function buildGeneralErrorGuidance(): string {
	return 'Apologize for the technical error. Ask if they want to try again or approach differently.';
}

export function buildResponderPrompt(): string {
	return prompt()
		.section('role', ROLE)
		.section('workflow_completion', WORKFLOW_COMPLETION)
		.section('style', STYLE)
		.section('guardrails', GUARDRAILS)
		.build();
}
