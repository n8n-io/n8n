import { Tool } from '@n8n/agents';
import { parseResourcePath, toResourcePath } from '@n8n/api-types';
import { UnexpectedError } from '@n8n/errors';
import { z } from 'zod';

import type { InstanceAiContext, InstanceAiPage } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

/** A requirement, not prose: a test pins the citation rule. Change it on purpose. */
export const GET_PAGE_DESCRIPTION = [
	'Reads a page: a Markdown document that the team keeps in a project, for example a runbook or the documentation of a workflow.',
	'Call it before you answer a question about a page, and when a message links a page as `/page/<pageId>`.',
	'A Markdown link in the content with an instance path is a reference to a workflow, a node, a credential, a data table or another page.',
	'When your answer uses the page, cite it as a Markdown link with the `url` from the result.',
].join('\n');

const inputSchema = z.object({
	page: z
		.string()
		.trim()
		.min(1)
		.describe('The id of the page, or its path in this instance, for example `/page/<pageId>`.'),
});

const outputSchema = z.object({
	pageId: z.string(),
	title: z.string(),
	content: z.string().describe('The body of the page, in Markdown.'),
	projectId: z.string(),
	updatedAt: z.string().describe('The date of the last change, in ISO 8601.'),
	url: z.string().describe('The path of the page in this instance. Use it as a link destination.'),
});

type GetPageOutput = z.infer<typeof outputSchema>;

/** Reads the page id from a page path of this instance. Any other text is the id itself. */
function toPageId(pageIdOrPath: string): string {
	const reference = parseResourcePath(pageIdOrPath);
	return reference?.resourceType === 'page' ? reference.resourceId : pageIdOrPath;
}

/** Shapes a page as the tool result. The `url` is relative to the instance. */
function toGetPageOutput(page: InstanceAiPage): GetPageOutput {
	return {
		pageId: page.id,
		title: page.title,
		content: page.content,
		projectId: page.projectId,
		updatedAt: page.updatedAt,
		url: toResourcePath({ resourceType: 'page', resourceId: page.id }),
	};
}

export function createGetPageTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.GET_PAGE)
		.description(GET_PAGE_DESCRIPTION)
		.input(inputSchema)
		.output(outputSchema)
		.handler(async ({ page }): Promise<GetPageOutput> => {
			const service = context.pageService;
			// The tool is registered only when the adapter is wired, so a missing
			// service is a wiring fault, not a user or instance state.
			if (!service) {
				throw new UnexpectedError('Pages are not enabled on this instance.');
			}

			return toGetPageOutput(await service.getPage(toPageId(page)));
		})
		.build();
}
