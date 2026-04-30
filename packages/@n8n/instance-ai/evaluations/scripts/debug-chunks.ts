// Streams a prompt through the same path as the eval (with auto-resume)
// and prints every tool-call, suspension, step-finish, and finish chunk.
// Use for root-causing `no_workflow_built` / `agent_error` failures.

import { Agent } from '@mastra/core/agent';
import { InMemoryStore } from '@mastra/core/storage';
import { nanoid } from 'nanoid';

import { registerWithMastra } from '../../src/agent/register-with-mastra';
import { executeResumableStream } from '../../src/runtime/resumable-stream-executor';
import { createAllTools } from '../../src/tools';
import { BUILDER_AGENT_PROMPT } from '../../src/tools/orchestration/build-workflow-agent.prompt';
import { asResumable } from '../../src/utils/stream-helpers';
import type { InstanceAiEventBus, StoredEvent } from '../../src/event-bus';
import type { InstanceAiEvent } from '@n8n/api-types';

import { createStubServices, defaultNodesJsonPath } from '../harness/stub-services';

function isRecord(v: unknown): v is Record<string, unknown> {
	return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function createBus(): InstanceAiEventBus {
	const store = new Map<string, StoredEvent[]>();
	return {
		publish(tid, event) {
			const list = store.get(tid) ?? [];
			list.push({ id: list.length + 1, event });
			store.set(tid, list);
		},
		subscribe() {
			return () => {};
		},
		getEventsAfter(tid, after) {
			return (store.get(tid) ?? []).filter((e) => e.id > after);
		},
		getEventsForRun(tid, runId) {
			return (store.get(tid) ?? [])
				.map((e) => e.event)
				.filter((e: InstanceAiEvent) => 'runId' in e && e.runId === runId);
		},
		getEventsForRuns(tid, runIds) {
			const s = new Set(runIds);
			return (store.get(tid) ?? [])
				.map((e) => e.event)
				.filter((e: InstanceAiEvent) => 'runId' in e && s.has(e.runId));
		},
		getNextEventId(tid) {
			return (store.get(tid) ?? []).length + 1;
		},
	};
}

async function main(): Promise<void> {
	const prompt = process.argv.slice(2).join(' ');
	if (!prompt) {
		console.error('usage: tsx evaluations/scripts/debug-chunks.ts "<prompt>"');
		process.exit(1);
	}

	const services = await createStubServices({ nodesJsonPath: defaultNodesJsonPath() });
	const allTools = createAllTools(services.context);
	const builderTools: Record<string, unknown> = {};
	for (const n of ['build-workflow', 'nodes', 'workflows', 'data-tables', 'templates']) {
		const t = (allTools as Record<string, unknown>)[n];
		if (t) builderTools[n] = t;
	}

	const agentId = 'debug-' + nanoid(6);
	const agent = new Agent({
		id: agentId,
		name: 'Debug Builder',
		instructions: {
			role: 'system' as const,
			content: BUILDER_AGENT_PROMPT,
			providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' as const } } },
		},
		model: 'anthropic/claude-sonnet-4-6',
		tools: builderTools,
	});
	registerWithMastra(agentId, agent, new InMemoryStore({ id: 'dbg-' + nanoid(6) }));

	const bus = createBus();
	const abort = new AbortController();
	const abortTimer = setTimeout(() => abort.abort(), 10 * 60 * 1000);
	// Don't keep Node alive after a successful run — finishing main()
	// should let the script exit immediately.
	abortTimer.unref();

	const counts = new Map<string, number>();
	const originalPublish = bus.publish.bind(bus);
	bus.publish = (tid, event) => {
		const type = event.type;
		counts.set(type, (counts.get(type) ?? 0) + 1);
		if (type === 'tool-call' && isRecord(event.payload)) {
			const tn = event.payload.toolName;
			console.log(`[tool-call] ${tn}`);
		} else if (type === 'tool-result' && isRecord(event.payload)) {
			const tn = event.payload.toolName;
			console.log(`[tool-result] ${tn}`);
		} else if (type === 'confirmation-request') {
			console.log(`[confirmation-request]`, JSON.stringify(event).substring(0, 200));
		} else if (type === 'run-finish') {
			console.log(`[run-finish]`, JSON.stringify(event.payload ?? {}).substring(0, 400));
		}
		originalPublish(tid, event);
	};

	const start = Date.now();
	const streamSource = await agent.stream(prompt, {
		maxSteps: 30,
		abortSignal: abort.signal,
		providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' as const } } },
	});

	const result = await executeResumableStream({
		agent: asResumable(agent),
		stream: streamSource,
		context: {
			threadId: 'dbg-thread-' + nanoid(6),
			runId: 'dbg-run-' + nanoid(6),
			agentId,
			eventBus: bus,
			signal: abort.signal,
			logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
		},
		control: {
			mode: 'auto',
			waitForConfirmation: async () => {
				console.log('[auto-approve]');
				return { approved: true };
			},
		},
	});

	console.log('\n=== RESULT ===');
	console.log('status:', result.status);
	console.log('elapsed:', Date.now() - start, 'ms');
	console.log('\n=== EVENT COUNTS ===');
	for (const [t, c] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
		console.log(`  ${t}: ${c}`);
	}
	console.log('captured workflows:', services.capturedWorkflows.length);
	if (result.text) {
		const text = await result.text;
		console.log('\n=== FINAL TEXT (last 500) ===');
		console.log(text.substring(Math.max(0, text.length - 500)));
	}
}

if (require.main === module) {
	main().catch((e) => {
		console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
		process.exit(1);
	});
}
