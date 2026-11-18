import type {
	CallToolResult,
	Client,
	Implementation,
	InputRequiredResult,
	ReadResourceResult,
	Resource,
	ServerCapabilities,
	Tool,
} from '@modelcontextprotocol/client';
import { lazyImport } from '@n8n/utils/lazy-import';

import type { InProcessFetch } from './in-process-fetch';

/** The identity the Assistant stamps into the `_meta` envelope of every request. */
export const ASSISTANT_MCP_CLIENT_INFO: Implementation = {
	name: 'n8n-assistant',
	version: '0.1.0',
};

/** The revision the instance server serves on its modern leg. */
export const INSTANCE_MCP_PROTOCOL_REVISION = '2026-07-28';

/** Never dialled: the transport's `fetch` stays in-process. */
const IN_PROCESS_MCP_URL = new URL('http://n8n.internal/mcp-server/http');

export type InstanceMcpCallToolOptions = {
	/**
	 * Answers to the `inputRequests` of a previous `input_required` result,
	 * keyed by the server's request keys. Each value is the bare result object,
	 * e.g. `{ action: 'accept', content: { ... } }` for an elicitation.
	 */
	inputResponses?: Record<string, unknown>;
	/** The opaque `requestState` of a previous `input_required` result, echoed verbatim. */
	requestState?: string;
	signal?: AbortSignal;
	timeoutMs?: number;
};

export type InstanceMcpCallToolResult = CallToolResult | InputRequiredResult;

export type InstanceMcpClientOptions = {
	fetch: InProcessFetch;
	clientInfo?: Implementation;
	/** Runs after the client closed, e.g. to tear down the in-process handler. */
	onClose?: () => Promise<void>;
};

type ClientSdk = typeof import('@modelcontextprotocol/client');

/**
 * A 2026-07-28 MCP client for the instance server. Multi-round-trip input is
 * manual: an `input_required` result reaches the caller, who decides how to
 * get the answer (the Assistant suspends its run), then retries the same call
 * with `inputResponses` and `requestState`.
 */
export class InstanceMcpClient {
	private constructor(
		private readonly client: Client,
		private readonly sdk: ClientSdk,
		private readonly onClose?: () => Promise<void>,
	) {}

	static async connect(options: InstanceMcpClientOptions): Promise<InstanceMcpClient> {
		const sdk = await lazyImport<ClientSdk>(
			async () => await import('@modelcontextprotocol/client'),
		);
		const client = new sdk.Client(options.clientInfo ?? ASSISTANT_MCP_CLIENT_INFO, {
			// Form elicitation is what the server's confirmation tools need from a client.
			capabilities: { elicitation: { form: {} } },
			// Pin the modern revision: a silent fallback to the 2025 leg would turn
			// every `input_required` into an `isError` text result.
			versionNegotiation: { mode: { pin: INSTANCE_MCP_PROTOCOL_REVISION } },
			inputRequired: { autoFulfill: false },
		});
		const transport = new sdk.StreamableHTTPClientTransport(IN_PROCESS_MCP_URL, {
			fetch: options.fetch,
		});
		await client.connect(transport);
		return new InstanceMcpClient(client, sdk, options.onClose);
	}

	/** The server's `instructions` from `server/discover`. */
	get instructions(): string | undefined {
		return this.client.getInstructions();
	}

	get serverCapabilities(): ServerCapabilities | undefined {
		return this.client.getServerCapabilities();
	}

	get serverVersion(): Implementation | undefined {
		return this.client.getServerVersion();
	}

	async listTools(): Promise<Tool[]> {
		const { tools } = await this.client.listTools();
		return tools;
	}

	async callTool(
		name: string,
		args: Record<string, unknown>,
		options: InstanceMcpCallToolOptions = {},
	): Promise<InstanceMcpCallToolResult> {
		const { inputResponses, requestState, signal, timeoutMs } = options;
		// The retry fields are top-level params the server lifts off before
		// dispatch; `request()` takes them as plain params. It is also what makes
		// manual multi-round-trip work: `callTool()` validates every result
		// against the tool's output schema, and an `input_required` result has no
		// structured content, so it rejects it (client 2.3.0).
		const params = {
			name,
			arguments: args,
			...(inputResponses ? { inputResponses } : {}),
			...(requestState !== undefined ? { requestState } : {}),
		};
		return await this.client.request(
			{ method: 'tools/call', params },
			{
				allowInputRequired: true,
				...(signal ? { signal } : {}),
				...(timeoutMs !== undefined ? { timeout: timeoutMs } : {}),
			},
		);
	}

	isInputRequired(result: InstanceMcpCallToolResult): result is InputRequiredResult {
		return this.sdk.isInputRequiredResult(result);
	}

	async listResources(): Promise<Resource[]> {
		const { resources } = await this.client.listResources();
		return resources;
	}

	async readResource(uri: string): Promise<ReadResourceResult> {
		return await this.client.readResource({ uri });
	}

	async close(): Promise<void> {
		try {
			await this.client.close();
		} finally {
			await this.onClose?.();
		}
	}
}
