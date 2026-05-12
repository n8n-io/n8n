import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { IUser } from 'n8n-workflow';
import { Readable } from 'stream';

import { AgentClient } from './cloud-agent-client.service';

/**
 * Receives SSE events from the cloud agent for a specific run and dispatches
 * `tool-call` events with `family: 'n8n'` to the local n8n side. Results are
 * posted back to the cloud agent via AgentClient.postToolResult.
 *
 * Lives alongside (not in place of) the controller's SSE forward to the
 * browser — the browser sees a pure byte pipe; the router runs its own
 * subscription so it can parse JSON and dispatch in the background.
 *
 * The actual dispatch is intentionally stubbed for this commit. Wiring each
 * family (`workflows`, `credentials`, `nodes`) to n8n's WorkflowService /
 * CredentialsService / LoadNodesAndCredentials lands in the adapter follow-up.
 */
@Service()
export class CloudAgentToolRouter {
	private readonly active = new Map<string, AbortController>();

	constructor(
		private readonly logger: Logger,
		private readonly client: AgentClient,
	) {}

	start(runId: string, threadId: string, user: IUser): void {
		if (this.active.has(runId)) return;
		const abort = new AbortController();
		this.active.set(runId, abort);
		void this.loop(runId, threadId, user, abort.signal).catch((err) => {
			this.logger
				.scoped('cloud-agent')
				.warn(`Tool router loop for run ${runId} crashed: ${this.errMessage(err)}`);
		});
	}

	stop(runId: string): void {
		const abort = this.active.get(runId);
		if (!abort) return;
		abort.abort();
		this.active.delete(runId);
	}

	stopAll(): void {
		for (const abort of this.active.values()) abort.abort();
		this.active.clear();
	}

	private async loop(
		runId: string,
		threadId: string,
		user: IUser,
		signal: AbortSignal,
	): Promise<void> {
		const upstream = await this.client.openEventStream(threadId, user);
		if (!upstream.ok || !upstream.body) {
			this.logger
				.scoped('cloud-agent')
				.warn(`Tool router could not open SSE for run ${runId}: ${upstream.status}`);
			this.active.delete(runId);
			return;
		}

		const stream = Readable.fromWeb(upstream.body as never);
		signal.addEventListener('abort', () => stream.destroy(), { once: true });

		let buffer = '';
		try {
			for await (const chunk of stream) {
				buffer += chunk.toString('utf-8');
				const frames = this.takeFrames(buffer);
				buffer = frames.remainder;
				for (const event of frames.events) {
					if (signal.aborted) return;
					await this.handle(runId, event, user);
				}
			}
		} catch (err) {
			if (!signal.aborted) {
				this.logger
					.scoped('cloud-agent')
					.warn(`Tool router stream for run ${runId} errored: ${this.errMessage(err)}`);
			}
		} finally {
			this.active.delete(runId);
		}
	}

	private async handle(runId: string, event: AgentEvent, user: IUser): Promise<void> {
		if (event.type === 'run-finish' || event.type === 'run-error') {
			this.active.delete(runId);
			return;
		}
		if (event.type !== 'tool-call' || event.family !== 'n8n') return;

		const result = await this.dispatch(event.name, event.args, user).catch((err) => ({
			output: { error: this.errMessage(err) },
			isError: true,
		}));

		try {
			await this.client.postToolResult(
				runId,
				{ toolCallId: event.toolCallId, output: result.output, isError: result.isError },
				user,
			);
		} catch (err) {
			this.logger
				.scoped('cloud-agent')
				.warn(`Posting tool-result for ${event.toolCallId} failed: ${this.errMessage(err)}`);
		}
	}

	/**
	 * Family dispatch. Intentionally stubbed: each handler returns shape-correct
	 * empty / placeholder data so the cloud agent has something to round-trip
	 * against. Real adapter wiring (WorkflowService / CredentialsService /
	 * LoadNodesAndCredentials) lands in the next commit.
	 */
	private async dispatch(
		name: string,
		args: unknown,
		_user: IUser,
	): Promise<{ output: unknown; isError: boolean }> {
		switch (name) {
			case 'workflows':
				return {
					output: { workflows: [], _stub: true, args },
					isError: false,
				};
			case 'credentials':
				return {
					output: { credentials: [], _stub: true, args },
					isError: false,
				};
			case 'nodes':
				return {
					output: { matches: [], _stub: true, args },
					isError: false,
				};
			default:
				return {
					output: { error: `unknown n8n tool: ${name}` },
					isError: true,
				};
		}
	}

	/**
	 * Pull complete `data: <json>\n\n` frames out of an SSE byte buffer,
	 * returning the parsed events and whatever partial frame remains in the
	 * buffer for the next read.
	 */
	private takeFrames(buffer: string): { events: AgentEvent[]; remainder: string } {
		const events: AgentEvent[] = [];
		let cursor = 0;
		while (true) {
			const sep = buffer.indexOf('\n\n', cursor);
			if (sep === -1) break;
			const block = buffer.slice(cursor, sep);
			cursor = sep + 2;
			const dataLine = block.split('\n').find((line) => line.startsWith('data: '));
			if (!dataLine) continue;
			const json = dataLine.slice('data: '.length);
			try {
				events.push(JSON.parse(json) as AgentEvent);
			} catch {
				// drop malformed frames
			}
		}
		return { events, remainder: buffer.slice(cursor) };
	}

	private errMessage(err: unknown): string {
		return err instanceof Error ? err.message : String(err);
	}
}

interface AgentEventBase {
	runId: string;
}

interface ToolCallEvent extends AgentEventBase {
	type: 'tool-call';
	toolCallId: string;
	name: string;
	args: unknown;
	family: 'sandbox' | 'n8n';
}

interface RunFinishEvent extends AgentEventBase {
	type: 'run-finish';
	status: 'completed' | 'cancelled' | 'errored';
}

interface RunErrorEvent extends AgentEventBase {
	type: 'run-error';
	message: string;
}

interface OtherEvent extends AgentEventBase {
	type: 'run-start' | 'text-delta' | 'tool-result';
}

type AgentEvent = ToolCallEvent | RunFinishEvent | RunErrorEvent | OtherEvent;
