import type {
	InstanceGatewayResourceDecision,
	McpTool,
	McpToolCallRequest,
	McpToolCallResult,
} from '@n8n/api-types';
import { GATEWAY_CONFIRMATION_REQUIRED_PREFIX } from '@n8n/api-types';
import type { LocalMcpServer } from '@n8n/instance-ai';
import type { BrowserUsePreference } from 'n8n-workflow';

import type { BrowserDomainGate, BrowserLocalMcpServer } from './browser-local-mcp-server';

/** A browser the router can start a session in. */
export interface BrowserBackend {
	kind: BrowserUsePreference;
	/** Starts a session and returns the server that drives it. */
	start(): Promise<BrowserLocalMcpServer>;
	end(): Promise<void>;
}

/** How long the user's browser choice applies. */
export type BrowserChoiceScope = 'chat' | 'always';

export interface BrowserRouterOptions {
	/** Continues a session an earlier router of the same run started. */
	activeServer?: BrowserLocalMcpServer;
	/** Called with the user's choice when more than one browser is available. */
	onChoice?: (kind: BrowserUsePreference, scope: BrowserChoiceScope) => Promise<void>;
}

const START_SESSION_TOOL = 'browser_start_session';
const END_SESSION_TOOL = 'browser_end_session';
const TAKEOVER_TOOL = 'browser_request_takeover';

/** Session tools the router replaces with its own start and end. */
const HIDDEN_BROWSER_TOOLS = new Set(['browser_connect', 'browser_disconnect']);

/** The confirmation decisions that pick a browser, and what each one means. */
const BROWSER_CHOICES = new Map<
	InstanceGatewayResourceDecision,
	{ kind: BrowserUsePreference; scope: BrowserChoiceScope }
>([
	['useLocalBrowserForChat', { kind: 'local', scope: 'chat' }],
	['useLocalBrowserAlways', { kind: 'local', scope: 'always' }],
	['useCloudBrowserForChat', { kind: 'cloud', scope: 'chat' }],
	['useCloudBrowserAlways', { kind: 'cloud', scope: 'always' }],
]);

const SESSION_TOOLS: McpTool[] = [
	{
		name: START_SESSION_TOOL,
		description:
			'Start a browser session for a web task. Call this before any other browser tool. ' +
			'A cloud browser session is billed for every minute it is open, so start one per task ' +
			'and end it with browser_end_session as soon as the task is done.',
		inputSchema: { type: 'object', properties: {} },
		annotations: { category: 'browser' },
	},
	{
		name: END_SESSION_TOOL,
		description: 'End the current browser session.',
		inputSchema: { type: 'object', properties: {} },
		annotations: { category: 'browser' },
	},
	{
		name: TAKEOVER_TOOL,
		description:
			'Hand the cloud browser to the user for a step only they can do, such as signing in, ' +
			'a 2FA code or a CAPTCHA. Open the page first. Returns when the user is done.',
		inputSchema: {
			type: 'object',
			properties: {
				message: {
					type: 'string',
					description: 'What the user should do in the browser, e.g. "Sign in to Google".',
				},
			},
			required: ['message'],
		},
		annotations: { category: 'browser' },
	},
];

/**
 * Lists the browser tools for one run and sends them to the browser session the
 * agent starts with `browser_start_session`. With more than one browser, the
 * user picks which one on the first start.
 */
export class BrowserRouterLocalMcpServer implements LocalMcpServer {
	private readonly tools: McpTool[];

	private readonly browserToolNames: Set<string>;

	private active?: { backend: BrowserBackend | undefined; server: BrowserLocalMcpServer };

	private starting = false;

	private gate?: BrowserDomainGate;

	constructor(
		browserTools: McpTool[],
		private readonly backends: BrowserBackend[],
		private readonly options: BrowserRouterOptions = {},
	) {
		const shared = browserTools.filter((tool) => !HIDDEN_BROWSER_TOOLS.has(tool.name));
		this.tools = [...SESSION_TOOLS, ...shared];
		this.browserToolNames = new Set(shared.map((tool) => tool.name));
		if (options.activeServer) {
			this.active = {
				backend: backends.find((backend) => backend.kind === 'cloud'),
				server: options.activeServer,
			};
		}
	}

	setDomainGate(gate: BrowserDomainGate | undefined): void {
		this.gate = gate;
		this.active?.server.setDomainGate(gate);
	}

	getAvailableTools(): McpTool[] {
		return this.tools;
	}

	getToolsByCategory(category: string): McpTool[] {
		return category === 'browser' ? this.tools : [];
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		if (req.name === START_SESSION_TOOL)
			return await this.startSession(req.arguments._confirmation);
		if (req.name === END_SESSION_TOOL) return await this.endSession();
		if (req.name === TAKEOVER_TOOL) return this.requestTakeover(req.arguments);

		if (!this.browserToolNames.has(req.name)) {
			return errorResult(`Unknown browser tool: ${req.name}`);
		}
		if (!this.active) {
			return errorResult('No browser session is active. Call browser_start_session first.');
		}
		return withSessionToolNames(await this.active.server.callTool(req));
	}

	private async startSession(confirmation: unknown): Promise<McpToolCallResult> {
		if (this.active || this.starting) {
			return errorResult(
				'A browser session is already active. End it with browser_end_session before starting a new one.',
			);
		}

		this.starting = true;
		try {
			const backend = await this.chooseBackend(confirmation);
			if (!backend) return browserChoiceRequiredResult(this.backends);

			const server = await backend.start();
			server.setDomainGate(this.gate);
			this.active = { backend, server };
			return textResult(`Started a ${backend.kind} browser session.`);
		} catch (error) {
			return errorResult(errorMessage(error));
		} finally {
			this.starting = false;
		}
	}

	/** The single backend, or the one the user picked. `undefined` means the user must pick. */
	private async chooseBackend(confirmation: unknown): Promise<BrowserBackend | undefined> {
		if (this.backends.length === 1) return this.backends[0];

		const choice = [...BROWSER_CHOICES].find(([decision]) => decision === confirmation)?.[1];
		const backend = choice && this.backends.find((candidate) => candidate.kind === choice.kind);
		if (!choice || !backend) return undefined;

		await this.options.onChoice?.(choice.kind, choice.scope);
		return backend;
	}

	/** Suspends the run until the user finishes their step in the live view. */
	private requestTakeover(args: Record<string, unknown>): McpToolCallResult {
		if (this.active?.backend?.kind !== 'cloud') {
			return errorResult('Takeover needs an active cloud browser session.');
		}
		if (args._confirmation === 'continueAfterTakeover') {
			return textResult(
				'The user finished in the browser. Take a fresh browser_snapshot before continuing: the page has changed.',
			);
		}
		if (args._confirmation === 'denyOnce') {
			return textResult('The user declined to take over the browser.');
		}
		const message = typeof args.message === 'string' ? args.message : 'Finish this step';
		return confirmationRequiredResult({
			toolGroup: 'browser',
			resource: 'browser',
			description: message,
			options: ['continueAfterTakeover', 'denyOnce'],
		});
	}

	private async endSession(): Promise<McpToolCallResult> {
		if (!this.active) {
			return errorResult('No browser session is active.');
		}

		const { backend } = this.active;
		this.active = undefined;
		try {
			await backend?.end();
			return textResult('Ended the browser session.');
		} catch (error) {
			return errorResult(errorMessage(error));
		}
	}
}

/** Asks the user which browser to use, through the gateway confirmation flow. */
function browserChoiceRequiredResult(backends: BrowserBackend[]): McpToolCallResult {
	const options = [...BROWSER_CHOICES]
		.filter(([, choice]) => backends.some((backend) => backend.kind === choice.kind))
		.map(([decision]) => decision);
	return confirmationRequiredResult({
		toolGroup: 'browser',
		resource: 'browser',
		description: 'Choose which browser n8n Assistant should use',
		options,
	});
}

/** Suspends the tool call until the user picks one of `options` in the chat. */
function confirmationRequiredResult(payload: {
	toolGroup: string;
	resource: string;
	description: string;
	options: InstanceGatewayResourceDecision[];
}): McpToolCallResult {
	return {
		content: [
			{ type: 'text', text: `${GATEWAY_CONFIRMATION_REQUIRED_PREFIX}${JSON.stringify(payload)}` },
		],
		isError: true,
	};
}

/** The browser tools' hints name `browser_connect`, which router users start with `browser_start_session`. */
function withSessionToolNames(result: McpToolCallResult): McpToolCallResult {
	if (!result.isError) return result;
	return {
		...result,
		content: result.content.map((item) =>
			item.type === 'text'
				? { ...item, text: item.text.replaceAll('browser_connect', START_SESSION_TOOL) }
				: item,
		),
	};
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
