import { Tool } from '@n8n/agents';
import { PAGE_TITLE_MAX_LENGTH, toResourcePath } from '@n8n/api-types';
import { UnexpectedError } from '@n8n/errors';
import { z } from 'zod';

import type { InstanceAiContext, InstanceAiCreatedPage } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

/** A requirement, not prose: a test pins the link formats and the writing rules. Change it on purpose. */
export const CREATE_PAGE_DESCRIPTION = [
	'Creates a page: a Markdown document that the team keeps in a project. Use it to document a workflow, to explain it in writing, or to write a runbook or notes.',
	'A Markdown link to a path of this instance becomes a live reference in the page, and the page then shows on the resource that it links. The link formats are:',
	'- Workflow: `[Workflow name](/workflow/<workflowId>)`',
	'- Node: `[Node name](/workflow/<workflowId>/<nodeId>)`',
	'- Page: `[Page title](/page/<pageId>)`',
	'- Credential: `[Credential name](/projects/<projectId>/credentials/<credentialId>)`',
	'- Data table: `[Table name](/projects/<projectId>/datatables/<dataTableId>)`',
	'Take each id from a tool result. A node id is the `id` of the node in the workflow that `get_workflow` returns (`nodes[].id` or `nodeIds`). Never invent an id and never use a node name as an id. When you do not have an id, write the name without a link.',
	'To document a workflow, read it first, then write a short page for a teammate who has never seen it. Keep the page under 200 words:',
	'1. Start with two sentences at most that say what the workflow does and when it runs. Link the workflow in them.',
	'2. `## How it works`: a numbered list in execution order. Each step is one line. Put nodes that do one job together in one step, link each node of the step and say what the step does. Seven steps at most.',
	'3. Link a credential or a data table in the step that uses it, when you know its id and its project.',
	'4. `## When it fails`: three bullets at most on what a person must do. Write this section only when the workflow has an error branch, a retry or a known failure.',
	'Write only these sections. State only what the reader cannot see on the canvas. Do not repeat parameter values, URLs or code. Do not list problems or advice that the user did not ask for. Do not paste the workflow JSON.',
	'After the call, link the page in your reply with the `url` from the result.',
].join('\n');

const inputSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1)
		.max(PAGE_TITLE_MAX_LENGTH)
		.describe('The title of the page. Do not repeat it as a heading in `content`.'),
	content: z.string().describe('The body of the page, in Markdown.'),
	projectId: z
		.string()
		.optional()
		.describe('The project that gets the page. Leave it out to use the project of this thread.'),
});

const outputSchema = z.object({
	pageId: z.string(),
	title: z.string(),
	url: z.string().describe('The path of the page in this instance. Use it as a link destination.'),
});

type CreatePageOutput = z.infer<typeof outputSchema>;

/** Shapes a created page as the tool result. The `url` is relative to the instance. */
function toCreatePageOutput(page: InstanceAiCreatedPage): CreatePageOutput {
	return {
		pageId: page.id,
		title: page.title,
		url: toResourcePath({ resourceType: 'page', resourceId: page.id }),
	};
}

export function createCreatePageTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.CREATE_PAGE)
		.description(CREATE_PAGE_DESCRIPTION)
		.input(inputSchema)
		.output(outputSchema)
		.handler(async (input): Promise<CreatePageOutput> => {
			const service = context.pageService;
			// The tool is registered only when the adapter is wired, so a missing
			// service is a wiring fault, not a user or instance state.
			if (!service) {
				throw new UnexpectedError('Pages are not enabled on this instance.');
			}

			return toCreatePageOutput(await service.createPage(input));
		})
		.build();
}
