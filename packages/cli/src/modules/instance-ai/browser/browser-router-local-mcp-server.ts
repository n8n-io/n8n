import type { McpTool, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';
import type { LocalMcpServer } from '@n8n/instance-ai';

import type { BrowserDomainGate, BrowserLocalMcpServer } from './browser-local-mcp-server';

/** A browser the router can start a session in. */
export interface BrowserBackend {
	kind: 'cloud' | 'local';
	/** Starts a session and returns the server that drives it. */
	start(): Promise<BrowserLocalMcpServer>;
	end(): Promise<void>;
}

const START_SESSION_TOOL = 'browser_start_session';
const END_SESSION_TOOL = 'browser_end_session';

/** Session tools the router replaces with its own start and end. */
const HIDDEN_BROWSER_TOOLS = new Set(['browser_connect', 'browser_disconnect']);

const SESSION_TOOLS: McpTool[] = [
	{
		name: START_SESSION_TOOL,
		description:
			'Start a browser session for a web task. Call this before any other browser tool. ' +
			'End it with browser_end_session when the task is done.',
		inputSchema: { type: 'object', properties: {} },
		annotations: { category: 'browser' },
	},
	{
		name: END_SESSION_TOOL,
		description: 'End the current browser session.',
		inputSchema: { type: 'object', properties: {} },
		annotations: { category: 'browser' },
	},
];

/**
 * Lists the browser tools for one run and sends them to the browser session the
 * agent starts with `browser_start_session`.
 */
export class BrowserRouterLocalMcpServer implements LocalMcpServer {
	private readonly tools: McpTool[];

	private readonly browserToolNames: Set<string>;

	private active?: BrowserLocalMcpServer;

	private starting = false;

	private gate?: BrowserDomainGate;

	constructor(
		browserTools: McpTool[],
		private readonly backend: BrowserBackend,
	) {
		const shared = browserTools.filter((tool) => !HIDDEN_BROWSER_TOOLS.has(tool.name));
		this.tools = [...SESSION_TOOLS, ...shared];
		this.browserToolNames = new Set(shared.map((tool) => tool.name));
	}

	setDomainGate(gate: BrowserDomainGate | undefined): void {
		this.gate = gate;
		this.active?.setDomainGate(gate);
	}

	getAvailableTools(): McpTool[] {
		return this.tools;
	}

	getToolsByCategory(category: string): McpTool[] {
		return category === 'browser' ? this.tools : [];
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		if (req.name === START_SESSION_TOOL) return await this.startSession();
		if (req.name === END_SESSION_TOOL) return await this.endSession();

		if (!this.browserToolNames.has(req.name)) {
			return errorResult(`Unknown browser tool: ${req.name}`);
		}
		if (!this.active) {
			return errorResult('No browser session is active. Call browser_start_session first.');
		}
		return await this.active.callTool(req);
	}

	private async startSession(): Promise<McpToolCallResult> {
		if (this.active || this.starting) {
			return errorResult(
				'A browser session is already active. End it with browser_end_session before starting a new one.',
			);
		}

		this.starting = true;
		try {
			const server = await this.backend.start();
			server.setDomainGate(this.gate);
			this.active = server;
			return textResult(`Started a ${this.backend.kind} browser session.`);
		} catch (error) {
			return errorResult(errorMessage(error));
		} finally {
			this.starting = false;
		}
	}

	private async endSession(): Promise<McpToolCallResult> {
		if (!this.active) {
			return errorResult('No browser session is active.');
		}

		this.active = undefined;
		try {
			await this.backend.end();
			return textResult('Ended the browser session.');
		} catch (error) {
			return errorResult(errorMessage(error));
		}
	}
}

function textResult(text: string): McpToolCallResult {
	return { content: [{ type: 'text', text }] };
}

function errorResult(text: string): McpToolCallResult {
	return { content: [{ type: 'text', text }], isError: true };
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
