import type { PageResourceReference } from '../schemas/page.schema';

const ID = '([^/]+)';

/** Second path segments of `/workflow/:workflowId/...` that open a workflow view, not a node. */
const WORKFLOW_VIEWS = new Set(['executions', 'debug', 'evaluation', 'history']);

/** Path segments that sit where an id is expected but open a creation form. */
const CREATION_SEGMENTS = new Set(['new']);

type ResourceRoute = {
	pattern: RegExp;
	toReference: (ids: string[]) => PageResourceReference;
};

function toWorkflowOrNodeReference([workflowId, viewOrNodeId]: string[]): PageResourceReference {
	const isNode = viewOrNodeId !== undefined && !WORKFLOW_VIEWS.has(viewOrNodeId);
	return isNode
		? { resourceType: 'node', resourceId: viewOrNodeId, workflowId }
		: { resourceType: 'workflow', resourceId: workflowId };
}

const RESOURCE_ROUTES: ResourceRoute[] = [
	{
		pattern: new RegExp(`^/workflow/${ID}(?:/${ID})?(?:/.*)?$`),
		toReference: toWorkflowOrNodeReference,
	},
	{
		pattern: new RegExp(`^/page/${ID}$`),
		toReference: ([pageId]) => ({ resourceType: 'page', resourceId: pageId }),
	},
	{
		pattern: new RegExp(`^/projects/[^/]+/pages/${ID}$`),
		toReference: ([pageId]) => ({ resourceType: 'page', resourceId: pageId }),
	},
	{
		pattern: new RegExp(`^/(?:projects/[^/]+|home)/credentials/${ID}$`),
		toReference: ([credentialId]) => ({ resourceType: 'credential', resourceId: credentialId }),
	},
	{
		pattern: new RegExp(`^/projects/[^/]+/datatables/${ID}$`),
		toReference: ([dataTableId]) => ({ resourceType: 'dataTable', resourceId: dataTableId }),
	},
];

/** Removes the query, the hash and a trailing slash. */
function toBarePath(path: string): string {
	return path.replace(/[?#].*$/, '').replace(/\/+$/, '');
}

function matchRoute(barePath: string, route: ResourceRoute): PageResourceReference | undefined {
	const ids = route.pattern.exec(barePath)?.slice(1);
	const isResource = ids !== undefined && !CREATION_SEGMENTS.has(ids[0]);
	return isResource ? route.toReference(ids) : undefined;
}

/**
 * Reads the n8n resource that an editor path opens.
 * The path is relative to the instance, for example `/workflow/abc123`.
 * Returns `undefined` when the path opens no referenceable resource.
 */
export function parseResourcePath(path: string): PageResourceReference | undefined {
	const barePath = toBarePath(path);
	return RESOURCE_ROUTES.reduce<PageResourceReference | undefined>(
		(reference, route) => reference ?? matchRoute(barePath, route),
		undefined,
	);
}

/** Where a resource lives. A credential or a data table opens inside its project. */
export type PageResourceLocation = PageResourceReference & { projectId?: string };

/**
 * Builds the editor path of a resource. `parseResourcePath` reads it back.
 * A data table needs a `projectId`. A credential without one opens from the home view.
 */
export function toResourcePath(location: PageResourceLocation): string {
	const { resourceId, projectId } = location;
	switch (location.resourceType) {
		case 'workflow':
			return `/workflow/${resourceId}`;
		case 'node':
			return `/workflow/${location.workflowId}/${resourceId}`;
		case 'page':
			return `/page/${resourceId}`;
		case 'credential':
			return projectId
				? `/projects/${projectId}/credentials/${resourceId}`
				: `/home/credentials/${resourceId}`;
		case 'dataTable':
			return `/projects/${projectId}/datatables/${resourceId}`;
	}
}

const MARKDOWN_LINK_DESTINATION = /\]\(\s*<?([^)\s>]+)>?[^)]*\)/g;

function toReferenceKey(reference: PageResourceReference): string {
	return `${reference.resourceType}:${reference.resourceId}`;
}

/**
 * Lists the n8n resources that a markdown text links to, without duplicates.
 * Only instance-relative link destinations count. A link to another host is not a reference.
 */
export function extractResourceReferences(markdown: string): PageResourceReference[] {
	const references = [...markdown.matchAll(MARKDOWN_LINK_DESTINATION)]
		.map(([, destination]) => parseResourcePath(destination))
		.filter((reference) => reference !== undefined);

	return [
		...new Map(references.map((reference) => [toReferenceKey(reference), reference])).values(),
	];
}
