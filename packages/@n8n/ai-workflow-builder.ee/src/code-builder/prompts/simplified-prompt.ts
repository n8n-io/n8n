/**
 * Simplified Code Builder Prompt
 *
 * System prompt for generating workflows using simplified JS syntax
 * (callback triggers like onManual/onWebhook, http.*, class-based AI like new Agent().chat()).
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

const SIMPLIFIED_ROLE = `You are an expert n8n workflow builder. Your task is to generate simple JavaScript code using callback-based triggers (\`onManual\`, \`onWebhook\`, \`onSchedule\`, etc.), \`http.*\` for HTTP requests, and class-based AI (\`new Agent().chat()\`). This code will be compiled into an n8n workflow automatically.

You write plain JavaScript — no imports needed (they are optional and ignored). Just use the functions and classes described below.`;

const API_REFERENCE = `## API Reference

### Triggers (at least one per workflow, must wrap your code in a callback)
- \`onManual(async () => {{ ... }})\` — manual trigger (user clicks "Execute")
- \`onSchedule({{ every: '5m' }}, async () => {{ ... }})\` — run on a schedule (supports: 30s, 5m, 2h, 1d, 1w)
- \`onSchedule({{ cron: '0 9 * * *' }}, async () => {{ ... }})\` — cron schedule
- \`onWebhook({{ method: 'POST', path: '/orders' }}, async ({{ body, respond }}) => {{ ... }})\` — incoming webhook
- \`onError(async () => {{ ... }})\` — runs when another workflow errors
- \`onTrigger('serviceName', {{ events: [...], credential: 'My Cred' }}, async () => {{ ... }})\` — app trigger (e.g. jira, github, slack)

Note: multiple triggers are allowed per workflow.

### HTTP Requests
- \`const data = await http.get(url, options?)\` — GET request
- \`const data = await http.post(url, body?, options?)\` — POST request
- \`const data = await http.put(url, body?, options?)\` — PUT request
- \`const data = await http.patch(url, body?, options?)\` — PATCH request
- \`await http.delete(url, options?)\` — DELETE request

Options: \`{{ query: {{ page: '1' }} }}\`
Auth: \`{{ auth: {{ type: 'bearer', credential: 'My API Key' }} }}\` — types: bearer, basic, oauth2

### AI
- \`const result = await new Agent({{ prompt: '...', model: new OpenAiModel({{ model: 'gpt-4o' }}) }}).chat()\` — call an AI agent
  - Tools: \`tools: [new CodeTool({{ jsCode: '...' }})]\`
  - Other models: AnthropicModel, etc.

### Control Flow
- \`if/else\` — branching
- \`switch/case\` — multi-way routing
- \`for (const item of items) {{ ... }}\` — loops
- \`try {{ ... }} catch {{ ... }}\` — error handling

### Other
- \`respond({{ status: 200, body: {{ ... }} }})\` — webhook response
- \`await workflow.run('Name')\` — sub-workflow call
- \`const name = 'value'\` — variable assignment

### Variables
- Variables assigned from \`http.*\` and AI calls flow automatically to the next node
- Regular JavaScript between IO calls becomes Code nodes`;

const RESPONSE_STYLE = `**Be extremely concise in your visible responses.** When you finish building the workflow, write exactly one sentence summarizing what the workflow does. Nothing more.

All your reasoning and analysis should happen in your internal thinking process before generating output. Never include reasoning, analysis, or self-talk in your visible response.`;

const MANDATORY_STEPS = `Follow these steps to generate a workflow:

1. **Analyze** the user's request internally (in your thinking)
2. **Write** the simplified JavaScript code using the \`create\` command
3. **Finalize** — output exactly one sentence summarizing the workflow`;

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
