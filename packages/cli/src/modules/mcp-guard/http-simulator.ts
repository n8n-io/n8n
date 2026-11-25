import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import type { EvalLlmMockHandler, EvalMockHttpResponse } from 'n8n-core';
import {
	HTTP_REQUEST_NODE_TYPE,
	HTTP_REQUEST_TOOL_LANGCHAIN_NODE_TYPE,
	type IHttpRequestOptions,
	type INode,
} from 'n8n-workflow';

import { redactEndpoint } from '../instance-ai/eval/request-sanitizer';

import { GUARDED_CALL_TIMEOUT_MS } from './mcp-guard-fetch';
import type { NodeRequestGuardScope } from './node-request-guard';

export const SIMULATED_HEADER = 'x-n8n-simulated';

const IDLE_MS = 6 * 60 * 60 * 1000;

// The agent runs a node as its tool variant, so the type of a tool call ends with `Tool`.
const GENERIC_HTTP_NODES: ReadonlySet<string> = new Set([
	HTTP_REQUEST_NODE_TYPE,
	`${HTTP_REQUEST_NODE_TYPE}Tool`,
	HTTP_REQUEST_TOOL_LANGCHAIN_NODE_TYPE,
]);

/** The HTTP Request node can call any host. Other nodes call the host of their service. */
export const isGenericHttpNode = (node: Pick<INode, 'type'>): boolean =>
	GENERIC_HTTP_NODES.has(node.type);

const failure = (statusCode: number, text: string): EvalMockHttpResponse => ({
	statusCode,
	headers: { 'content-type': 'text/plain', [SIMULATED_HEADER]: 'true' },
	body: text,
});

interface Simulation {
	// A promise, so two first requests of a chat share one handler and one write ledger.
	handler: Promise<EvalLlmMockHandler>;
	lastUsed: number;
}

/**
 * Answers the calls of an HTTP Request node to a host that has no vendor in the guard. A model
 * invents the answer. Nothing goes to the network. One mock for each chat, so a read that follows a
 * write shows the write.
 */
@Service()
export class HttpSimulator {
	private readonly simulations = new Map<string, Simulation>();

	async respond(
		options: IHttpRequestOptions,
		node: INode,
		scope: NodeRequestGuardScope,
	): Promise<EvalMockHttpResponse> {
		if (!scope.chatId) return failure(403, 'mcp-guard: no chat for this node tool');
		const handler = await this.handlerFor(`${scope.agentId ?? 'agent'}-${scope.chatId}`, scope);
		this.log(options);

		let timer: NodeJS.Timeout | undefined;
		const timeout = new Promise<EvalMockHttpResponse>((resolve) => {
			timer = setTimeout(
				() => resolve(failure(504, 'mcp-guard: the simulated call took too long')),
				GUARDED_CALL_TIMEOUT_MS,
			);
		});
		try {
			const res = await Promise.race([this.invoke(handler, options, node), timeout]);
			return { ...res, headers: { ...res.headers, [SIMULATED_HEADER]: 'true' } };
		} finally {
			clearTimeout(timer);
		}
	}

	private async invoke(
		handler: EvalLlmMockHandler,
		options: IHttpRequestOptions,
		node: INode,
	): Promise<EvalMockHttpResponse> {
		// The mock does not throw. It answers a failure with an error marker, so check for the marker.
		const { isMockErrorSentinel } = await import('../instance-ai/eval/mock-handler.js');
		try {
			const res = await handler(options, node);
			if (res === undefined || isMockErrorSentinel(res)) {
				return failure(502, 'mcp-guard: the simulator could not answer');
			}
			return res;
		} catch {
			return failure(502, 'mcp-guard: the simulator could not answer');
		}
	}

	private async handlerFor(key: string, scope: NodeRequestGuardScope): Promise<EvalLlmMockHandler> {
		const now = Date.now();
		for (const [id, simulation] of this.simulations) {
			if (simulation.lastUsed < now - IDLE_MS) this.simulations.delete(id);
		}
		let simulation = this.simulations.get(key);
		if (!simulation) {
			simulation = {
				handler: this.createHandler(scope).catch((error: unknown) => {
					// A failed load must not stay in the map.
					this.simulations.delete(key);
					throw error;
				}),
				lastUsed: now,
			};
			this.simulations.set(key, simulation);
		}
		simulation.lastUsed = now;
		return await simulation.handler;
	}

	private async createHandler(scope: NodeRequestGuardScope): Promise<EvalLlmMockHandler> {
		// Load the mock only when a chat needs it. It brings the eval code of Instance AI.
		const { createLlmMockHandler } = await import('../instance-ai/eval/mock-handler.js');
		return createLlmMockHandler({ model: scope.model, redactSecrets: true });
	}

	// Method, host and path only, with a token-like segment hidden. Never the query, the headers or the body.
	private log(options: IHttpRequestOptions): void {
		let target = 'unknown';
		try {
			const url = new URL(options.url, options.baseURL);
			target = `${url.host}${redactEndpoint(url.pathname)}`;
		} catch {
			// Keep the placeholder. A bad URL must not stop the answer.
		}
		Container.get(Logger).info(
			`mcp-guard http ${(options.method ?? 'GET').toUpperCase()} ${target} -> simulated`,
		);
	}
}
