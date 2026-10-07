import type * as SdkClientModule from '@modelcontextprotocol/sdk/client/index.js';
import type * as SdkTransportModule from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type * as SdkTypesModule from '@modelcontextprotocol/sdk/types.js';
import { lazyImport } from '@n8n/utils/lazy-import';

export interface McpSdk {
	Client: typeof SdkClientModule.Client;
	StreamableHTTPClientTransport: typeof SdkTransportModule.StreamableHTTPClientTransport;
	StreamableHTTPError: typeof SdkTransportModule.StreamableHTTPError;
	McpError: typeof SdkTypesModule.McpError;
	requestTimeoutCode: number;
	connectionClosedCode: number;
}

export type SdkClient = InstanceType<McpSdk['Client']>;

/** The time limit, and an optional signal that cancels the request. */
export type SdkRequestOptions = NonNullable<Parameters<SdkClient['listTools']>[1]>;

const CLIENT_INFO = { name: 'n8n-linked-instance', version: '1.0.0' };
const MAX_TOOL_LIST_PAGES = 20;

let sdkPromise: Promise<McpSdk> | undefined;
// Set once the SDK loads, so error classification can stay synchronous.
let loadedSdk: McpSdk | undefined;

// The SDK is large and only linked instances need it, so it loads on first use.
async function loadSdk(): Promise<McpSdk> {
	sdkPromise ??= Promise.all([
		lazyImport<typeof SdkClientModule>(
			async () => await import('@modelcontextprotocol/sdk/client/index.js'),
		),
		lazyImport<typeof SdkTransportModule>(
			async () => await import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
		),
		lazyImport<typeof SdkTypesModule>(
			async () => await import('@modelcontextprotocol/sdk/types.js'),
		),
	]).then(([clientModule, transportModule, typesModule]) => ({
		Client: clientModule.Client,
		StreamableHTTPClientTransport: transportModule.StreamableHTTPClientTransport,
		StreamableHTTPError: transportModule.StreamableHTTPError,
		McpError: typesModule.McpError,
		requestTimeoutCode: Number(typesModule.ErrorCode.RequestTimeout),
		connectionClosedCode: Number(typesModule.ErrorCode.ConnectionClosed),
	}));
	loadedSdk = await sdkPromise;
	return loadedSdk;
}

/** Undefined until the first connection loads the SDK. An error from the SDK means it loaded. */
export function getLoadedSdk(): McpSdk | undefined {
	return loadedSdk;
}

export async function closeQuietly(client: SdkClient): Promise<void> {
	await client.close().catch(() => {});
}

/** The options apply to the `initialize` request. */
export async function openConnection(
	url: URL,
	fetchFn: typeof fetch,
	options: SdkRequestOptions,
): Promise<SdkClient> {
	const sdk = await loadSdk();
	const client = new sdk.Client(CLIENT_INFO, { capabilities: {} });
	try {
		await client.connect(new sdk.StreamableHTTPClientTransport(url, { fetch: fetchFn }), options);
		return client;
	} catch (error) {
		await closeQuietly(client);
		throw error;
	}
}

/** Reads at most 20 pages, so a remote that always sends a cursor cannot keep the client busy. */
export async function listAllToolNames(
	client: SdkClient,
	options: SdkRequestOptions,
): Promise<string[]> {
	const names: string[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < MAX_TOOL_LIST_PAGES; page++) {
		const result = await client.listTools(cursor ? { cursor } : undefined, options);
		names.push(...result.tools.map((tool) => tool.name));
		cursor = result.nextCursor;
		if (!cursor) break;
	}
	return names;
}
