import type {
	INodeCredentials,
	INodeListSearchResult,
	INodeParameters,
	INodeTypeNameVersion,
} from 'n8n-workflow';

/**
 * Callback type for fetching resource locator options.
 * This callback is injected from the CLI package where DynamicNodeParametersService is available.
 */
export type ResourceLocatorCallback = (
	methodName: string,
	path: string,
	nodeTypeAndVersion: INodeTypeNameVersion,
	currentNodeParameters: INodeParameters,
	credentials?: INodeCredentials,
	filter?: string,
	paginationToken?: string,
) => Promise<INodeListSearchResult>;

/**
 * Factory type for creating resource locator callbacks.
 * The factory is called with userId to create a callback scoped to that user's credentials context.
 */
export type ResourceLocatorCallbackFactory = (userId: string) => ResourceLocatorCallback;
