import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { AgentService } from '../cloud-agent/cloud-agent.service';

type FlushableResponse = Response & { flush?: () => void };

/**
 * Cloud-agent event shape on the wire. Mirrors the discriminated union the
 * service emits over SSE. Declared locally instead of importing from the
 * cloud-agent module so we don't drag the cloud-agent transport types into
 * instance-ai's surface.
 */
type CloudAgentEvent =
	| { type: 'run-start'; runId: string; threadId: string; ts: number }
	| { type: 'text-delta'; runId: string; delta: string }
	| {
			type: 'tool-call';
			runId: string;
			toolCallId: string;
			name: string;
			args: unknown;
			family: 'sandbox' | 'n8n';
	  }
	| {
			type: 'tool-result';
			runId: string;
			toolCallId: string;
			output: unknown;
			isError: boolean;
	  }
	| {
			type: 'run-finish';
			runId: string;
			status: 'completed' | 'cancelled' | 'errored';
			usage?: { inputTokens: number; outputTokens: number };
	  }
	| { type: 'run-error'; runId: string; message: string };

interface RunContext {
	runId: string;
	messageId: string;
	agentId: string;
}

/**
 * Bridges the existing /rest/instance-ai REST surface to the cloud-agent
 * module when the cloud-agent feature flag is on.
 *
 * The frontend keeps using instance-ai's store/api unchanged — this service
 * is responsible for:
 *   - forwarding chat / cancel / events to cloud-agent
 *   - tracking each thread's active runId (cloud-agent cancels by runId, while
 *     the instance-ai surface only knows threadIds)
 *   - translating cloud-agent's canonical event union into the InstanceAiEvent
 *     shape the existing instance-ai reducer expects
 *
 * When the flag is off, instance-ai keeps its current behavior — this service
 * is a no-op.
 */
@Service()
export class CloudAgentBridgeService {
	private readonly contexts = new Map<string, RunContext>();

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly agentService: AgentService,
	) {}

	isEnabled(): boolean {
		return this.globalConfig.cloudAgent.enabled === true;
	}

	async startRun(
		user: User,
		threadId: string,
		message: string,
	): Promise<{ runId: string; messageId: string }> {
		const messageId = randomUUID();
		const agentId = `cloud-agent:${threadId}`;
		const { runId } = await this.agentService.startRun({ threadId, message }, user);
		this.contexts.set(threadId, { runId, messageId, agentId });
		return { runId, messageId };
	}

	async cancelRun(user: User, threadId: string): Promise<void> {
		const ctx = this.contexts.get(threadId);
		if (!ctx) return;
		await this.agentService.cancelRun(ctx.runId, user);
	}

	/**
	 * Open the cloud-agent SSE stream and relay frames to the browser,
	 * translating each cloud-agent event into an InstanceAiEvent so the
	 * existing reducer renders it correctly. Resolves when the upstream
	 * stream closes or the client disconnects.
	 */
	async streamEvents(
		req: Request,
		res: FlushableResponse,
		threadId: string,
		user: User,
		lastEventId?: number,
	): Promise<void> {
		const ctx = this.ensureContext(threadId);

		const upstream = await this.agentService.openEventStream(threadId, user, lastEventId);
		if (!upstream.ok || !upstream.body) {
			res.status(upstream.status || 502).end();
			return;
		}

		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('Content-Encoding', 'identity');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();

		const reader = upstream.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		const stop = () => {
			void reader.cancel().catch(() => undefined);
		};
		req.once('close', stop);

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });

				const parts = buffer.split('\n\n');
				buffer = parts.pop() ?? '';
				for (const part of parts) this.relayFrame(part, res, ctx);
			}
		} catch (err) {
			this.logger.scoped('cloud-agent').warn(`SSE relay failed: ${String(err)}`);
		} finally {
			req.off('close', stop);
			if (!res.writableEnded) res.end();
		}
	}

	private ensureContext(threadId: string): RunContext {
		const existing = this.contexts.get(threadId);
		if (existing) return existing;
		// Stream was opened before the first /chat call. Synthesise a context
		// so any incoming events can still be translated. The real runId is
		// filled in on the next startRun.
		const ctx: RunContext = {
			runId: '',
			messageId: randomUUID(),
			agentId: `cloud-agent:${threadId}`,
		};
		this.contexts.set(threadId, ctx);
		return ctx;
	}

	private relayFrame(frame: string, res: FlushableResponse, ctx: RunContext): void {
		let id: number | undefined;
		let data: string | undefined;
		for (const line of frame.split('\n')) {
			if (line.startsWith('id:')) {
				const n = Number.parseInt(line.slice(3).trim(), 10);
				if (Number.isFinite(n)) id = n;
			} else if (line.startsWith('data:')) {
				data = line.slice(5).trim();
			}
		}
		if (!data) return;

		let parsed: unknown;
		try {
			parsed = JSON.parse(data);
		} catch {
			return;
		}
		if (!isCloudAgentEvent(parsed)) return;

		const translated = translateCloudAgentEvent(parsed, ctx);
		if (!translated) return;

		res.write(`id: ${id ?? 0}\ndata: ${JSON.stringify(translated)}\n\n`);
		res.flush?.();
	}
}

function isCloudAgentEvent(value: unknown): value is CloudAgentEvent {
	if (typeof value !== 'object' || value === null) return false;
	const t = (value as { type?: unknown }).type;
	return (
		t === 'run-start' ||
		t === 'text-delta' ||
		t === 'tool-call' ||
		t === 'tool-result' ||
		t === 'run-finish' ||
		t === 'run-error'
	);
}

/**
 * Pure mapping from the cloud-agent canonical event union to InstanceAiEvent.
 * Returns null when the event has no instance-ai equivalent (today every
 * cloud-agent event maps to exactly one instance-ai event, but the null
 * branch keeps the door open for events we choose not to surface).
 */
export function translateCloudAgentEvent(
	source: CloudAgentEvent,
	ctx: RunContext,
): InstanceAiEvent | null {
	const base = { runId: source.runId, agentId: ctx.agentId };

	switch (source.type) {
		case 'run-start':
			return {
				...base,
				type: 'run-start',
				payload: { messageId: ctx.messageId },
			};
		case 'text-delta':
			return {
				...base,
				type: 'text-delta',
				payload: { text: source.delta },
			};
		case 'tool-call': {
			const args =
				typeof source.args === 'object' && source.args !== null
					? (source.args as Record<string, unknown>)
					: {};
			return {
				...base,
				type: 'tool-call',
				payload: {
					toolCallId: source.toolCallId,
					toolName: `${source.family}.${source.name}`,
					args,
				},
			};
		}
		case 'tool-result':
			if (source.isError) {
				return {
					...base,
					type: 'tool-error',
					payload: {
						toolCallId: source.toolCallId,
						error:
							typeof source.output === 'string' ? source.output : JSON.stringify(source.output),
					},
				};
			}
			return {
				...base,
				type: 'tool-result',
				payload: { toolCallId: source.toolCallId, result: source.output },
			};
		case 'run-finish':
			return {
				...base,
				type: 'run-finish',
				payload: { status: source.status === 'errored' ? 'error' : source.status },
			};
		case 'run-error':
			return {
				...base,
				type: 'error',
				payload: { content: source.message },
			};
	}
}
