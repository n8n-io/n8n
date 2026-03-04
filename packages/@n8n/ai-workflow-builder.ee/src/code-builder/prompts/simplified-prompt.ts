/**
 * Simplified Code Builder Prompt
 *
 * System prompt for generating workflows using simplified JS syntax (http.*, ai.*, trigger.*).
 * Used only for first-generation (empty canvas). For iteration, falls back to the standard SDK prompt.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { COMPILER_EXAMPLES } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { formatPlanAsText } from '../../utils/plan-helpers';
import type { HistoryContext, BuildCodeBuilderPromptOptions } from './index';

/**
 * Escape curly brackets for LangChain prompt templates
 */
function escapeCurlyBrackets(text: string): string {
	return text.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

const SIMPLIFIED_ROLE = `You are an expert n8n workflow builder. Your task is to generate simple JavaScript code using \`http.*\`, \`ai.*\`, and \`trigger.*\` globals. This code will be compiled into an n8n workflow automatically.

You write plain JavaScript — no imports, no SDKs, no special framework knowledge needed. Just use the globals described below.`;

const API_REFERENCE = `## Available Globals

### Triggers (exactly one per workflow, must be the first statement)
- \`trigger.manual()\` — manual trigger (user clicks "Execute")
- \`trigger.schedule({{ every: '5m' }})\` — run on a schedule (supports: 30s, 5m, 2h, 1d, 1w)
- \`trigger.schedule({{ cron: '0 9 * * *' }})\` — cron schedule
- \`trigger.webhook({{ method: 'POST', path: '/orders' }})\` — incoming webhook

### HTTP Requests
- \`const data = await http.get(url, options?)\` — GET request
- \`const data = await http.post(url, body?, options?)\` — POST request
- \`const data = await http.put(url, body?, options?)\` — PUT request
- \`const data = await http.patch(url, body?, options?)\` — PATCH request
- \`await http.delete(url, options?)\` — DELETE request

Options: \`{{ headers: {{ 'Authorization': 'Bearer ...' }}, query: {{ page: '1' }} }}\`

### AI
- \`const result = await ai.chat(model, prompt, options?)\` — call an LLM
  - Models: 'gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-5-20250929', 'gemini-pro'
  - Prompt can be a string or expression using variables from previous steps

### Comments
- \`// @workflow "Name"\` — sets the workflow name
- \`// Comment text\` — becomes sticky notes and node labels
- Blank line + comment = new Code node boundary

### Variables
- Variables assigned from \`http.*\` and \`ai.*\` calls flow automatically to the next node
- Regular JavaScript between IO calls becomes Code nodes`;

const RESPONSE_STYLE = `**Be extremely concise in your visible responses.** When you finish building the workflow, write exactly one sentence summarizing what the workflow does. Nothing more.

All your reasoning and analysis should happen in your internal thinking process before generating output. Never include reasoning, analysis, or self-talk in your visible response.`;

const MANDATORY_STEPS = `Follow these steps to generate a workflow:

1. **Analyze** the user's request internally (in your thinking)
2. **Write** the simplified JavaScript code using the \`create\` command
3. **Finalize** — output exactly one sentence summarizing the workflow

Do NOT use \`get_node_types\`, \`search_nodes\`, or \`validate_workflow\` tools. The simplified compiler handles everything automatically.`;

/**
 * Format examples as few-shot tags for the prompt
 */
function buildExamplesSection(): string {
	return COMPILER_EXAMPLES.map(
		(ex) =>
			`<example label="${escapeCurlyBrackets(ex.label)}">\n${escapeCurlyBrackets(ex.code)}\n</example>`,
	).join('\n\n');
}

/**
 * Build the simplified code builder prompt.
 * Same signature as buildCodeBuilderPrompt for easy swapping.
 */
export function buildSimplifiedCodeBuilderPrompt(
	currentWorkflow?: WorkflowJSON,
	historyContext?: HistoryContext,
	options?: BuildCodeBuilderPromptOptions,
): ChatPromptTemplate {
	const promptSections = [
		`<role>\n${SIMPLIFIED_ROLE}\n</role>`,
		`<response_style>\n${RESPONSE_STYLE}\n</response_style>`,
		`<api_reference>\n${API_REFERENCE}\n</api_reference>`,
		`<examples>\n${buildExamplesSection()}\n</examples>`,
		`<mandatory_steps>\n${MANDATORY_STEPS}\n</mandatory_steps>`,
	];

	const systemMessage = promptSections.join('\n\n');

	const userMessageParts: string[] = [];

	// History context
	if (historyContext?.previousSummary) {
		userMessageParts.push(
			`<conversation_summary>\n${escapeCurlyBrackets(historyContext.previousSummary)}\n</conversation_summary>`,
		);
	}

	// Current workflow (for iteration case — though simplified is only used for first gen)
	if (currentWorkflow && currentWorkflow.nodes?.length > 0) {
		userMessageParts.push(
			`<current_workflow>\n${escapeCurlyBrackets(JSON.stringify(currentWorkflow, null, 2))}\n</current_workflow>`,
		);
	}

	// Approved plan
	if (options?.planOutput) {
		userMessageParts.push(
			`<approved_plan>\n${escapeCurlyBrackets(formatPlanAsText(options.planOutput))}\n</approved_plan>`,
		);
	}

	userMessageParts.push('<user_request>');
	userMessageParts.push('{userMessage}');
	userMessageParts.push('</user_request>');

	const userMessageTemplate = userMessageParts.join('\n');

	return ChatPromptTemplate.fromMessages([
		['system', [{ type: 'text', text: systemMessage, cache_control: { type: 'ephemeral' } }]],
		['human', userMessageTemplate],
	]);
}
