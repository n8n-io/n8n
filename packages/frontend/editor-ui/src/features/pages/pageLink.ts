import { parseResourcePath, toResourcePath, type PageResourceLocation } from '@n8n/api-types';
import { toInstanceRelativePath, type InstanceLocation } from '@n8n/frontend-module-page';

const SINGLE_MARKDOWN_LINK = /^\[[^\]]*\]\(\s*<?([^)\s>]+)>?\s*\)$/;

/** Reads the destination of a text that is one markdown link. Any other text comes back unchanged. */
function toLinkDestination(text: string): string {
	return SINGLE_MARKDOWN_LINK.exec(text)?.[1] ?? text;
}

/** A link address has no whitespace. This keeps a sentence that starts with an address out. */
function isSingleToken(text: string): boolean {
	return text !== '' && !/\s/.test(text);
}

/**
 * Reads the id of the page that a text links to.
 * Returns an id only when the trimmed text is nothing but a link to a page of this instance:
 * an absolute URL, an instance-relative path, or one markdown link to either.
 */
export function readLinkedPageId(content: string, instance: InstanceLocation): string | undefined {
	const destination = toLinkDestination(content.trim());
	const path = isSingleToken(destination)
		? toInstanceRelativePath(destination, instance)
		: undefined;
	const reference = path === undefined ? undefined : parseResourcePath(path);
	return reference?.resourceType === 'page' ? reference.resourceId : undefined;
}

/** Builds the text that links to a page. `readLinkedPageId` reads the id back. */
export function toPageLink(pageId: string): string {
	return toResourcePath({ resourceType: 'page', resourceId: pageId });
}

function escapeMarkdownLinkText(text: string): string {
	return text.replace(/[\\[\]]/g, '\\$&');
}

/** Builds a markdown link that opens a resource. The link text is the name of the resource. */
export function toResourceMarkdownLink(resource: PageResourceLocation, name: string): string {
	return `[${escapeMarkdownLinkText(name)}](${toResourcePath(resource)})`;
}

/** Builds a markdown link that opens a workflow. */
export function toWorkflowMarkdownLink(workflow: { id: string; name: string }): string {
	return toResourceMarkdownLink(
		{ resourceType: 'workflow', resourceId: workflow.id },
		workflow.name,
	);
}
