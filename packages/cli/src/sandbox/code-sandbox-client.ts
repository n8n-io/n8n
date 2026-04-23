import type { TaskResultData } from '@n8n/task-runner';
import type { INodeExecutionData } from 'n8n-workflow';
import { fetch as undiciFetch, Pool } from 'undici';

interface ExecTaskRequest {
	reuse_key: string;
	packages: string[];
	code: string;
	mode: 'runOnceForAllItems' | 'runOnceForEachItem';
	item_index: number;
	input_items: INodeExecutionData[];
	settings: { timeout_ms: number };
}

interface NdjsonEvent {
	type: string;
	data?: TaskResultData;
	error?: { name: string; message: string; stack?: string };
}

// One connection pool per service origin, shared across all client instances.
const pools = new Map<string, Pool>();

function getPool(serviceUrl: string): Pool {
	const origin = new URL(serviceUrl).origin;
	let pool = pools.get(origin);
	if (!pool) {
		pool = new Pool(origin, { connections: 10, keepAliveTimeout: 30_000 });
		pools.set(origin, pool);
	}
	return pool;
}

export class CodeSandboxClient {
	private readonly pool: Pool;

	constructor(
		private readonly serviceUrl: string,
		private readonly apiKey: string,
		private readonly reuseKey?: string,
		private readonly packages: string[] = [],
	) {
		this.pool = getPool(serviceUrl);
	}

	async runTask(
		code: string,
		mode: 'runOnceForAllItems' | 'runOnceForEachItem',
		itemIndex: number,
		inputItems: INodeExecutionData[],
		timeoutMs = 60_000,
	): Promise<TaskResultData> {
		const body: ExecTaskRequest = {
			reuse_key: this.reuseKey ?? '',
			packages: this.packages,
			code,
			mode,
			item_index: itemIndex,
			input_items: inputItems,
			settings: { timeout_ms: timeoutMs },
		};

		const res = await undiciFetch(`${this.serviceUrl}/code-sessions/run`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey },
			body: JSON.stringify(body),
			dispatcher: this.pool,
		});

		if (!res.ok) {
			throw new Error(`Sandbox exec failed: HTTP ${res.status}`);
		}

		const text = await res.text();
		for (const line of text.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			const event = JSON.parse(trimmed) as NdjsonEvent;
			if (event.type === 'result' && event.data !== undefined) {
				return event.data;
			}
			if (event.type === 'error' && event.error) {
				const err = new Error(event.error.message);
				err.name = event.error.name;
				if (event.error.stack) err.stack = event.error.stack;
				throw err;
			}
			// log events are silently dropped for now
		}
		throw new Error('Sandbox task ended without a result');
	}
}
