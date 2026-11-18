import { Tool } from '@n8n/agents';
import { parseResourcePath, toResourcePath } from '@n8n/api-types';
import { UnexpectedError } from '@n8n/errors';
import { z } from 'zod';

import type { InstanceAiContext, InstanceAiPage } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

/** A requirement, not prose: a test pins the read-first rule. Change it on purpose. */
export const UPDATE_PAGE_DESCRIPTION = [
	'Replaces the body of a page with a new Markdown text. The title does not change.',
	'Read the page with `get_page` first, and read each workflow that it links, so that the new text states only what is true now.',
	'Send the whole new body. Keep each sentence that is still correct, word for word. Change only what is wrong or missing.',
	'Keep the links of the page. A link to a node that no longer exists must go.',
	'The page has no version history. Do not remove a section that the user did not ask you to remove.',
	'After the call, tell the user in two or three sentences what you changed, with a link to the page from the `url` of the result.',
].join('\n');

const inputSchema = z.object({
	page: z
		.string()
		.trim()
		.min(1)
		.describe('The id of the page, or its path in this instance, for example `/page/<pageId>`.'),
	content: z.string().describe('The whole new body of the page, in Markdown.'),
});

const outputSchema = z.object({
	pageId: z.string(),
	title: z.string(),
	projectId: z.string(),
	updatedAt: z.string().describe('The date of this change, in ISO 8601.'),
	url: z.string().describe('The path of the page in this instance. Use it as a link destination.'),
});

type UpdatePageOutput = z.infer<typeof outputSchema>;

/** Reads the page id from a page path of this instance. Any other text is the id itself. */
function toPageId(pageIdOrPath: string): string {
	const reference = parseResourcePath(pageIdOrPath);
	return reference?.resourceType === 'page' ? reference.resourceId : pageIdOrPath;
}

/** Shapes the saved page as the tool result, without its content. The `url` is relative to the instance. */
function toUpdatePageOutput(page: InstanceAiPage): UpdatePageOutput {
	return {
		pageId: page.id,
		title: page.title,
		projectId: page.projectId,
		updatedAt: page.updatedAt,
		url: toResourcePath({ resourceType: 'page', resourceId: page.id }),
	};
}

export function createUpdatePageTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.UPDATE_PAGE)
		.description(UPDATE_PAGE_DESCRIPTION)
		.input(inputSchema)
		.output(outputSchema)
		.handler(async ({ page, content }): Promise<UpdatePageOutput> => {
			const service = context.pageService;
			// The tool is registered only when the adapter is wired, so a missing
			// service is a wiring fault, not a user or instance state.
			if (!service) {
				throw new UnexpectedError('Pages are not enabled on this instance.');
			}

			return toUpdatePageOutput(
				await service.updatePageContent({ pageId: toPageId(page), content }),
			);
		})
		.build();
}
