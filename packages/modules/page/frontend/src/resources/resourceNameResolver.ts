import type { PageResourceReference } from '@n8n/api-types';

export type WorkflowOutline = {
	name: string;
	active?: boolean;
	updatedAt?: string;
	nodes: Array<{ id: string; name: string; type?: string }>;
};

/**
 * What the server tells about a resource. Only `name` is always present.
 * A node has the name `workflow › node`, and carries both parts and the state of its workflow.
 */
export type ResourceDetails = {
	name: string;
	updatedAt?: string;
	isActive?: boolean;
	nodeName?: string;
	/** The name of the node type, for example `n8n-nodes-base.slack`. */
	nodeType?: string;
	workflowName?: string;
};

/** Each fetcher reads one resource from the server. It rejects or gives `undefined` when the user cannot read it. */
export type ResourceFetchers = {
	workflow: (workflowId: string) => Promise<WorkflowOutline>;
	credential: (credentialId: string) => Promise<ResourceDetails>;
	dataTable: (dataTableId: string) => Promise<ResourceDetails | undefined>;
	page: (pageId: string) => Promise<ResourceDetails>;
};

export const NODE_NAME_SEPARATOR = ' › ';

/** Identifies a resource. Two references to the same resource give the same key. */
export function toResourceKey(reference: PageResourceReference): string {
	return reference.resourceType === 'node'
		? `node:${reference.workflowId}:${reference.resourceId}`
		: `${reference.resourceType}:${reference.resourceId}`;
}

/**
 * Wraps a fetcher so that each id makes one request.
 * A failed request resolves to `undefined` and stays cached until `forget(id)`.
 */
function createRequestCache<T>(fetch: (id: string) => Promise<T | undefined>) {
	const requests = new Map<string, Promise<T | undefined>>();

	async function get(id: string): Promise<T | undefined> {
		const request = requests.get(id) ?? fetch(id).catch(() => undefined);
		requests.set(id, request);
		return await request;
	}

	function forget(id: string): void {
		requests.delete(id);
	}

	return { get, forget };
}

function toWorkflowDetails(workflow: WorkflowOutline | undefined): ResourceDetails | undefined {
	return workflow
		? { name: workflow.name, updatedAt: workflow.updatedAt, isActive: workflow.active }
		: undefined;
}

function toNodeDetails(
	workflow: WorkflowOutline | undefined,
	nodeId: string,
): ResourceDetails | undefined {
	const node = workflow?.nodes.find(({ id }) => id === nodeId);
	return workflow && node
		? {
				...toWorkflowDetails(workflow),
				name: `${workflow.name}${NODE_NAME_SEPARATOR}${node.name}`,
				nodeName: node.name,
				nodeType: node.type,
				workflowName: workflow.name,
			}
		: undefined;
}

/**
 * Resolves the current name and details of a resource.
 * A workflow and all the nodes of that workflow share one request.
 * The result is `undefined` when the resource does not exist or the user cannot read it.
 */
export function createResourceNameResolver(fetchers: ResourceFetchers) {
	const workflows = createRequestCache(fetchers.workflow);
	const credentials = createRequestCache(fetchers.credential);
	const dataTables = createRequestCache(fetchers.dataTable);
	const pages = createRequestCache(fetchers.page);

	async function resolve(reference: PageResourceReference): Promise<ResourceDetails | undefined> {
		switch (reference.resourceType) {
			case 'workflow':
				return toWorkflowDetails(await workflows.get(reference.resourceId));
			case 'node':
				return toNodeDetails(await workflows.get(reference.workflowId), reference.resourceId);
			case 'credential':
				return await credentials.get(reference.resourceId);
			case 'dataTable':
				return await dataTables.get(reference.resourceId);
			case 'page':
				return await pages.get(reference.resourceId);
		}
	}

	async function resolveName(reference: PageResourceReference): Promise<string | undefined> {
		return (await resolve(reference))?.name;
	}

	/** Drops the cached answer, so the next `resolve` asks the server again. */
	function forget(reference: PageResourceReference): void {
		switch (reference.resourceType) {
			case 'workflow':
				return workflows.forget(reference.resourceId);
			case 'node':
				return workflows.forget(reference.workflowId);
			case 'credential':
				return credentials.forget(reference.resourceId);
			case 'dataTable':
				return dataTables.forget(reference.resourceId);
			case 'page':
				return pages.forget(reference.resourceId);
		}
	}

	return { resolve, resolveName, forget };
}
