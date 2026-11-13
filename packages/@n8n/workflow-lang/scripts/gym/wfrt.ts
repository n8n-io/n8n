/**
 * Run (b): a client of the admin API of `wfrt` (spec 9.1). It loads a
 * module, starts a manual execution with trace on, and collects the events
 * of that execution (spec 9.2) from the one event stream.
 */
import type { JsonRecord } from './sample.ts';
import { isRecord } from './sample.ts';

/** n8n's engine sleeps in process for waits shorter than this, and parks longer ones. */
const V1_WAIT_IN_PROCESS_MS = 65_000;

/** How long a run that waits for a resume may still end with a `finished` event. */
const WAIT_GRACE_MS = 3000;

export interface WfrtEvent extends JsonRecord {
	type: string;
	executionId?: string;
}

export interface ExecutionEvents {
	events: WfrtEvent[];
	/** The `finished` event, or a `waiting` event when the execution waits for a resume. */
	end?: WfrtEvent;
}

interface Waiter {
	events: WfrtEvent[];
	done: (r: ExecutionEvents) => void;
}

/** Answers a `service` event (spec 9.9): `{ ok, result }` or `{ ok: false, error }`. */
export type ServiceHandler = (event: WfrtEvent) => Promise<unknown>;

export class WfrtClient {
	private readonly waiters = new Map<string, Waiter>();

	/** The backend of service calls. Without it, the calls time out. */
	onService?: ServiceHandler;

	/** The answers of the calls in this client, by call id and attempt: a call sent again gets the same answer. */
	private readonly answers = new Map<string, Promise<unknown>>();

	private stream?: AbortController;

	dropped = 0;

	readonly adminUrl: string;

	private readonly secret: string;

	constructor(adminUrl: string, secret: string) {
		this.adminUrl = adminUrl;
		this.secret = secret;
	}

	private async request(method: string, path: string, body?: unknown): Promise<unknown> {
		const res = await fetch(`${this.adminUrl}${path}`, {
			method,
			headers: {
				authorization: `Bearer ${this.secret}`,
				...(body === undefined ? {} : { 'content-type': 'application/json' }),
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const text = await res.text();
		if (!res.ok) throw new Error(`wfrt ${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
		try {
			return text === '' ? undefined : JSON.parse(text);
		} catch {
			return text;
		}
	}

	/** Opens the event stream. It runs until `close`. */
	async open(): Promise<void> {
		this.stream = new AbortController();
		const res = await fetch(`${this.adminUrl}/_admin/events`, {
			headers: { authorization: `Bearer ${this.secret}` },
			signal: this.stream.signal,
		});
		if (!res.ok || !res.body) throw new Error(`wfrt event stream: ${res.status}`);
		const body = res.body;
		void (async () => {
			const decoder = new TextDecoder();
			let buffer = '';
			try {
				for await (const chunk of body) {
					buffer += decoder.decode(chunk, { stream: true });
					let nl = buffer.indexOf('\n');
					while (nl >= 0) {
						const line = buffer.slice(0, nl).trim();
						buffer = buffer.slice(nl + 1);
						if (line) this.onLine(line);
						nl = buffer.indexOf('\n');
					}
				}
			} catch {
				// The stream ends when `close` aborts it.
			}
		})();
	}

	private onLine(line: string) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch {
			return;
		}
		if (!isRecord(parsed) || typeof parsed.type !== 'string') return;
		const event: WfrtEvent = { ...parsed, type: parsed.type };
		if (event.type === 'dropped') this.dropped += typeof event.count === 'number' ? event.count : 1;
		if (event.type === 'service') void this.answerService(event);
		const id = typeof event.executionId === 'string' ? event.executionId : undefined;
		if (!id) return;
		// `run` waits before it starts the execution, so an event without a waiter is a late
		// event of an execution that has ended here: drop it, so no state stays behind.
		const w = this.waiters.get(id);
		if (!w) return;
		w.events.push(event);
		if (event.type === 'finished') {
			this.waiters.delete(id);
			w.done({ events: w.events, end: event });
			return;
		}
		if (event.type !== 'waiting') return;
		// A short timed wait goes on by itself, as v1 sleeps in process below 65 s. A longer
		// one, or a wait for a resume, ends the run. `wfrt` sends the message of a "send and
		// wait" node after the `waiting` event, and fails the step if the host fails: the
		// run ends after a grace time in which a `finished` event can still come.
		const till = typeof event.waitTill === 'number' ? event.waitTill : undefined;
		if (till !== undefined && till - Date.now() < V1_WAIT_IN_PROCESS_MS) return;
		setTimeout(() => {
			if (this.waiters.get(id) !== w) return;
			this.waiters.delete(id);
			w.done({ events: w.events, end: event });
		}, WAIT_GRACE_MS).unref();
	}

	private async answerService(event: WfrtEvent): Promise<void> {
		const handler = this.onService;
		if (!handler || typeof event.callId !== 'string') return;
		const key = `${event.callId}#${typeof event.attempt === 'number' ? event.attempt : 0}`;
		let answer = this.answers.get(key);
		if (!answer) {
			answer = handler(event);
			this.answers.set(key, answer);
		}
		try {
			await this.request(
				'POST',
				`/_admin/services/${encodeURIComponent(event.callId)}`,
				await answer,
			);
		} catch {
			// The call has an answer already, or its execution ended.
		}
	}

	close() {
		this.stream?.abort();
	}

	async putWorkflow(workflowId: string, body: JsonRecord): Promise<void> {
		await this.request('PUT', `/_admin/workflows/${encodeURIComponent(workflowId)}`, body);
	}

	async deleteWorkflow(workflowId: string): Promise<void> {
		try {
			await this.request('DELETE', `/_admin/workflows/${encodeURIComponent(workflowId)}`);
		} catch {
			// Not loaded.
		}
	}

	async cancel(executionId: string): Promise<void> {
		try {
			await this.request('DELETE', `/_admin/executions/${encodeURIComponent(executionId)}`);
		} catch {
			// Finished already.
		}
	}

	/** Starts a manual run with trace on and waits for its end or the timeout. */
	async run(
		workflowId: string,
		executionId: string,
		trigger: unknown,
		timeoutMs: number,
	): Promise<ExecutionEvents> {
		const result = new Promise<ExecutionEvents>((resolve) => {
			const waiter: Waiter = { events: [], done: resolve };
			this.waiters.set(executionId, waiter);
			setTimeout(() => {
				if (this.waiters.get(executionId) === waiter) {
					this.waiters.delete(executionId);
					resolve({ events: waiter.events });
				}
			}, timeoutMs).unref();
		});
		await this.request('POST', '/_admin/executions', {
			workflowId,
			executionId,
			trigger,
			trace: true,
		});
		const out = await result;
		// A waiting or `needs_attention` execution stays parked and keeps its module: end it.
		if (!out.end || out.end.type === 'waiting' || out.end.status === 'needs_attention') {
			await this.cancel(executionId);
		}
		return out;
	}
}

/** The output lists of each node from the `trace` events: one list for each output, all runs joined. */
export function traceNodes(events: WfrtEvent[]): Record<string, unknown[][]> {
	const nodes: Record<string, unknown[][]> = {};
	for (const e of events) {
		if (e.type !== 'trace' || typeof e.step !== 'string') continue;
		const raw = Array.isArray(e.items) ? e.items : [];
		const lists = raw.length > 0 && raw.every((x: unknown) => Array.isArray(x)) ? raw : [raw];
		const outputs = (nodes[e.step] ??= []);
		lists.forEach((list: unknown, k: number) => {
			outputs[k] = [...(outputs[k] ?? []), ...(Array.isArray(list) ? list : [])];
		});
	}
	return nodes;
}
