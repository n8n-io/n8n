import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import { Container } from '@n8n/di';
import type { Logger } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AgentChatBridge } from '../../agent-chat-bridge';
import { ChatIntegrationRegistry, type AgentChatIntegration } from '../../agent-chat-integration';
import type { ChatIntegrationService, ChatInstance } from '../../chat-integration.service';
import type { ComponentMapper } from '../../component-mapper';
import { ChatIntegrationActionExecutor } from '../../integration-action-executor';
import type { IntegrationMessageContextService } from '../../integration-message-context.service';
import type {
	IntegrationMessageContext,
	IntegrationMessageContextStore,
} from '../../integration-tools';
import { getIntegrationToolConnectionDescriptors } from '../../integration-tools';

type AgentExecutorLike = ConstructorParameters<typeof AgentChatBridge>[2];

export type ReplayWebhookOptions = { waitUntil?: (task: Promise<unknown>) => void };

export type ReplayWebhookHandler = (
	request: Request,
	options?: ReplayWebhookOptions,
) => Promise<Response>;

export interface ReplayApiCall {
	method: string;
	body: Record<string, unknown>;
}

export class MemoryMessageContextStore implements IntegrationMessageContextStore {
	private readonly contexts = new Map<string, IntegrationMessageContext>();

	async getLatest(threadId: string): Promise<IntegrationMessageContext | null> {
		return await Promise.resolve(this.contexts.get(threadId) ?? null);
	}

	async setLatest(
		threadId: string,
		_resourceId: string,
		context: IntegrationMessageContext,
	): Promise<void> {
		this.contexts.set(threadId, context);
		await Promise.resolve();
		return;
	}

	latest(): IntegrationMessageContext | undefined {
		return [...this.contexts.values()].at(-1);
	}

	latestThreadId(): string | undefined {
		return [...this.contexts.keys()].at(-1);
	}
}

export function toStream(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
	return (async function* stream() {
		await Promise.resolve();
		for (const chunk of chunks) yield chunk;
	})();
}

export async function sendJsonWebhook(
	handler: (
		request: Request,
		options?: { waitUntil?: (task: Promise<unknown>) => void },
	) => Promise<Response>,
	url: string,
	payload: unknown,
	headers: Headers = new Headers(),
): Promise<Response> {
	const tasks: Array<Promise<unknown>> = [];
	headers.set('content-type', 'application/json');
	const response = await handler(
		new Request(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(payload),
		}),
		{ waitUntil: (task) => tasks.push(task) },
	);
	await Promise.all(tasks);
	return response;
}

export interface StubbedRequest {
	httpMethod: string;
	url: string;
	body: Record<string, unknown>;
	rawBody: string | undefined;
}

export interface StubResponse {
	/** Recorded call exposed to assertions (platform method name + request body). */
	apiCall: ReplayApiCall;
	/** JSON body returned to the real adapter so it proceeds without live network I/O. */
	responseBody: unknown;
	status?: number;
}

/**
 * Network-boundary interceptor for the real platform adapters. Replaces
 * `globalThis.fetch` for URLs matching `match`, records each matched request as a
 * {@link ReplayApiCall}, and returns a canned JSON response. The adapter under test
 * runs for real; only the external platform HTTP is answered here (from recorded
 * fixtures or minimal stubs). Non-matching requests fall through. Call `restore()`
 * on teardown. Adapters that use a non-fetch HTTP client (e.g. Slack's axios-based
 * `@slack/web-api`) need `nock` instead.
 */
export function installFetchStub(options: {
	match: RegExp;
	onRequest: (request: StubbedRequest) => StubResponse;
}): { apiCalls: ReplayApiCall[]; restore: () => void } {
	const apiCalls: ReplayApiCall[] = [];
	const originalFetch = globalThis.fetch;

	globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		if (!options.match.test(url)) return await originalFetch(input, init);

		const httpMethod = init?.method ?? (input instanceof Request ? input.method : 'GET');
		const rawBody =
			typeof init?.body === 'string'
				? init.body
				: input instanceof Request
					? await input
							.clone()
							.text()
							.catch(() => undefined)
					: undefined;
		let body: Record<string, unknown> = {};
		if (rawBody) {
			try {
				const parsed: unknown = JSON.parse(rawBody);
				if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
			} catch {
				body = {};
			}
		}

		const { apiCall, responseBody, status } = options.onRequest({ httpMethod, url, body, rawBody });
		apiCalls.push(apiCall);

		return new Response(JSON.stringify(responseBody), {
			status: status ?? 200,
			headers: { 'content-type': 'application/json' },
		});
	};

	return {
		apiCalls,
		restore: () => {
			globalThis.fetch = originalFetch;
		},
	};
}

export interface ReplayContextSetup<TChat extends ChatInstance = ChatInstance> {
	chat: TChat;
	agentExecutor: {
		executeForChatPublished: Mock;
		resumeForChat: Mock;
	};
	actionExecutor: ChatIntegrationActionExecutor;
	descriptor: ReturnType<typeof getIntegrationToolConnectionDescriptors>[number];
	integration: AgentIntegrationConfig;
	messageContextStore: MemoryMessageContextStore;
	nextStream: (chunks: StreamChunk[]) => void;
	shutdown: () => Promise<void>;
}

export function createReplayContextSetup<TChat extends ChatInstance>(params: {
	chat: TChat;
	integrationImpl: AgentChatIntegration;
	integration: AgentIntegrationConfig;
	componentMapper?: ComponentMapper;
	stream?: StreamChunk[];
}): ReplayContextSetup<TChat> {
	const registry = new ChatIntegrationRegistry();
	registry.register(params.integrationImpl);
	Container.set(ChatIntegrationRegistry, registry);

	let stream = params.stream ?? [
		{ type: 'text-delta', id: 'text-1', delta: 'Got it' },
		{ type: 'finish', finishReason: 'stop' },
	];
	const agentExecutor = {
		executeForChatPublished: vi.fn(() => toStream(stream)),
		resumeForChat: vi.fn(() => toStream(stream)),
	};
	const messageContextStore = new MemoryMessageContextStore();

	new AgentChatBridge(
		params.chat as never,
		'agent-1',
		agentExecutor as AgentExecutorLike,
		params.componentMapper ?? mock<ComponentMapper>(),
		mock<Logger>(),
		'project-1',
		params.integration,
		messageContextStore as unknown as IntegrationMessageContextService,
	);

	const chatIntegrationService = mock<ChatIntegrationService>();
	chatIntegrationService.getChatInstance.mockReturnValue(params.chat);
	const actionExecutor = new ChatIntegrationActionExecutor(chatIntegrationService, registry);
	const descriptor = getIntegrationToolConnectionDescriptors([params.integration], 'agent-1')[0];

	return {
		chat: params.chat,
		agentExecutor,
		actionExecutor,
		descriptor,
		integration: params.integration,
		messageContextStore,
		nextStream: (chunks: StreamChunk[]) => {
			stream = chunks;
		},
		shutdown: async () => {
			await params.chat.shutdown();
			Container.reset();
		},
	};
}
