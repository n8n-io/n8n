// ---------------------------------------------------------------------------
// Drive first builds against a running n8n and record their latency
//
// Thin I/O layer: every number comes from `computeLatencyMetrics`. Each run
// uses a fresh thread. The sandbox identity is per thread, so every run starts
// with a cold sandbox, as a user's first build does.
// ---------------------------------------------------------------------------

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import type { LatencyRunArgs } from './args';
import { STOP_EVENT_TYPES, computeLatencyMetrics, type LatencyRunRecord } from './metrics';
import { LATENCY_PROMPTS, type LatencyPrompt } from './prompts';
import { N8nClient } from '../clients/n8n-client';
import { SSE_SETTLE_DELAY_MS, startSseConnection } from '../harness/chat-loop';
import { savedWorkflowsFromEvents } from '../outcome/event-parser';
import type { CapturedEvent } from '../types';

const STOP_POLL_MS = 250;

export async function runLatencyArm(args: LatencyRunArgs): Promise<string> {
	const client = new N8nClient(args.baseUrl);
	await client.login();
	const gitSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
	await mkdir(args.outDir, { recursive: true });
	const file = join(args.outDir, `${args.label}.jsonl`);

	for (let rep = 1; rep <= args.repeat; rep++) {
		for (const prompt of LATENCY_PROMPTS) {
			const record = await runOnce(client, prompt, args, gitSha);
			await appendFile(file, `${JSON.stringify(record)}\n`);
			console.log(
				`[${args.label}] ${rep}/${args.repeat} ${prompt.id} ${JSON.stringify(record.metrics)}`,
			);
		}
	}
	return file;
}

async function runOnce(
	client: N8nClient,
	prompt: LatencyPrompt,
	args: LatencyRunArgs,
	gitSha: string,
): Promise<LatencyRunRecord> {
	const threadId = randomUUID();
	await client.ensureThread(threadId, undefined, { benchmark: 'latency', prompt_id: prompt.id });
	const events: CapturedEvent[] = [];
	const abort = new AbortController();
	// A dropped stream otherwise looks like a run that never finished.
	const sse = startSseConnection(client, threadId, events, abort.signal).catch((error: unknown) => {
		if (!abort.signal.aborted) console.warn(`  SSE stream failed: ${String(error)}`);
	});
	await delay(SSE_SETTLE_DELAY_MS);

	const sentAt = Date.now();
	try {
		await client.sendMessage(threadId, prompt.text);
		await waitForStop(events, args.timeoutMs);
	} finally {
		abort.abort();
		await sse;
		await cleanUp(client, threadId, events);
	}

	const metrics = computeLatencyMetrics(events, sentAt);
	return { label: args.label, gitSha, promptId: prompt.id, threadId, metrics };
}

async function waitForStop(events: CapturedEvent[], timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline && !events.some((event) => STOP_EVENT_TYPES.has(event.type))) {
		await delay(STOP_POLL_MS);
	}
}

/** Best effort: a leftover thread or workflow must not fail the benchmark. */
async function cleanUp(
	client: N8nClient,
	threadId: string,
	events: CapturedEvent[],
): Promise<void> {
	const steps = [
		async () => await client.cancelRun(threadId),
		...savedWorkflowsFromEvents(events).map(
			({ id }) =>
				async () =>
					await client.deleteWorkflow(id),
		),
		async () => await client.deleteThread(threadId),
	];
	for (const step of steps) {
		await step().catch((error: unknown) => console.warn(`  cleanup step failed: ${String(error)}`));
	}
}
