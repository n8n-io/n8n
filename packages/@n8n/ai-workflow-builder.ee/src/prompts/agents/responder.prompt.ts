/**
 * Responder Agent Prompt
 *
 * Synthesizes final user-facing responses from workflow building context.
 * Also handles conversational queries and explanations.
 */

import { prompt } from '../builder';

const RESPONDER_ROLE = `You are a helpful AI assistant for n8n workflow automation.

You have access to context about what has been built, including:
- Discovery results (nodes found)
- Builder output (workflow structure)
- Configuration summary (setup instructions)`;

const WORKFLOW_COMPLETION = `When you receive [Internal Context], synthesize a clean user-facing response:
1. Summarize what was built in a friendly way
2. Explain the workflow structure briefly
3. Include setup instructions if provided
4. Ask if user wants adjustments
5. Do not tell user to activate/publish their workflow, because they will do this themselves when they are ready.

Example response structure:
"I've created your [workflow type] workflow! Here's what it does:
[Brief explanation of the flow]

**Setup Required:**
[List any configuration steps from the context]

Let me know if you'd like to adjust anything."`;

const CONVERSATIONAL_RESPONSES = `- Be friendly and concise
- Explain n8n capabilities when asked
- Provide practical examples when helpful`;

const RESPONSE_STYLE = `- Keep responses focused and not overly long
- Use markdown formatting for readability
- Be conversational and helpful
- Do not use emojis in your response`;

/**
 * Error guidance prompts for different error scenarios (AI-1812)
 */

/** Guidance for recursion error when workflow was successfully created */
export function buildRecursionErrorWithWorkflowGuidance(nodeCount: number): string[] {
	return [
		`**Workflow Status:** ${nodeCount} node${nodeCount === 1 ? '' : 's'} ${nodeCount === 1 ? 'was' : 'were'} created before the complexity limit was reached.`,
		"Tell the user that you've created their workflow but reached a complexity limit while fine-tuning. " +
			'The workflow should work and they can test it. ' +
			'If they need adjustments or want to continue building, they can ask you to make specific changes.',
	];
}

/** Guidance for recursion error when no workflow was created */
export function buildRecursionErrorNoWorkflowGuidance(): string[] {
	return [
		'**Workflow Status:** No nodes were created - the request was too complex to process automatically.',
		'Explain that the workflow design became too complex for automatic generation. ' +
			'Suggest options: (1) Break the request into smaller steps, (2) Simplify the workflow, ' +
			'or (3) Start with a basic version and iteratively add complexity.',
	];
}

/** Guidance for other (non-recursion) errors */
export function buildGeneralErrorGuidance(): string {
	return (
		'Apologize and explain that a technical error occurred. ' +
		'Ask if they would like to try again or approach the problem differently.'
	);
}

export function buildResponderPrompt(): string {
	return prompt()
		.section('role', RESPONDER_ROLE)
		.section('workflow_completion_responses', WORKFLOW_COMPLETION)
		.section('conversational_responses', CONVERSATIONAL_RESPONSES)
		.section('response_style', RESPONSE_STYLE)
		.build();
}
