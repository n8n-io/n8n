// ---------------------------------------------------------------------------
// In-process workflow build for pairwise evals.
//
// Rather than wire up the full orchestrator (which requires a
// BackgroundTaskManager, workflowTaskService, trace context, etc.), we
// invoke the same builder sub-agent that the orchestrator would delegate
// to — a Mastra Agent given BUILDER_AGENT_PROMPT plus the `build-workflow`
// tool and a few supporting domain tools. For single-workflow prompts in
// the pairwise dataset the orchestrator's only job is to route here, so
// skipping it loses nothing material.
//
// The built workflow is captured through the stub `workflowService`'s
// `createFromWorkflowJSON` hook — the `build-workflow` tool calls it.
//
// HITL: several domain tools (data-tables create, delete workflow, etc.)
// suspend the stream waiting for user approval. We run the stream through
// `executeResumableStream` with `mode: 'auto'` so every confirmation
// request auto-approves — otherwise the stream silently ends at the
// first suspension and the builder never completes.
// ---------------------------------------------------------------------------

import type { InstanceAiEvent } from '@n8n/api-types';
import { Agent } from '@mastra/core/agent';
import { InMemoryStore } from '@mastra/core/storage';
import { createWriteStream, type WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';

import type { SimpleWorkflow } from '../../../ai-workflow-builder.ee/evaluations/evaluators/pairwise';

import { registerWithMastra } from '../../src/agent/register-with-mastra';
import type { InstanceAiEventBus, StoredEvent } from '../../src/event-bus';
import type { Logger } from '../../src/logger';
import { executeResumableStream } from '../../src/runtime/resumable-stream-executor';
import { createAllTools } from '../../src/tools';
import { BUILDER_AGENT_PROMPT } from '../../src/tools/orchestration/build-workflow-agent.prompt';
import type { ModelConfig } from '../../src/types';
import { asResumable } from '../../src/utils/stream-helpers';
import { createStubServices, defaultNodesJsonPath, type StubServiceHandle } from './stub-services';
import { normalizeWorkflow } from './normalize-workflow';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type BuildErrorClass = 'build_timeout' | 'no_workflow_built' | 'agent_error';

export interface InProcessBuildResult {
	success: boolean;
	workflow?: SimpleWorkflow;
	extraWorkflows: SimpleWorkflow[];
	errorClass?: BuildErrorClass;
	errorMessage?: string;
	durationMs: number;
	finalText?: string;
	interactivity: {
		askUserCount: number;
		planToolCount: number;
		autoApprovedSuspensions: number;
		mockedCredentialTypes: string[];
	};
}

export interface BuildInProcessOptions {
	prompt: string;
	modelId?: ModelConfig;
	nodesJsonPath?: string;
	timeoutMs?: number;
	/** Max builder steps — matches production default when omitted. */
	maxSteps?: number;
	/**
	 * Path to a chunk log file. When set, every tool-call, tool-result,
	 * suspension, text-delta, and lifecycle event is appended to this
	 * file. Parent dirs are created as needed. Used for root-causing
	 * build failures (`no_workflow_built`, `agent_error`, etc.).
	 */
	logPath?: string;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export async function buildInProcess(
	options: BuildInProcessOptions,
): Promise<InProcessBuildResult> {
	const started = Date.now();
	const timeoutMs = options.timeoutMs ?? 20 * 60 * 1000;
	const modelId: ModelConfig = options.modelId ?? 'anthropic/claude-sonnet-4-6';
	const maxSteps = options.maxSteps ?? 30;

	const interactivity = {
		askUserCount: 0,
		planToolCount: 0,
		autoApprovedSuspensions: 0,
		mockedCredentialTypes: new Set<string>(),
	};

	const chunkLog = options.logPath ? await openChunkLog(options.logPath) : null;
	chunkLog?.writeHeader(options.prompt, { modelId, maxSteps, timeoutMs });

	let services: StubServiceHandle;
	try {
		services = await createStubServices({
			nodesJsonPath: options.nodesJsonPath ?? defaultNodesJsonPath(),
		});
	} catch (error) {
		chunkLog?.write({ kind: 'error', stage: 'stub-services', message: String(error) });
		await chunkLog?.close();
		return failResult(started, 'agent_error', error, interactivity);
	}

	const allTools = createAllTools(services.context);
	const builderToolNames = [
		'build-workflow',
		'nodes',
		'workflows',
		'data-tables',
		'templates',
	] as const;
	const builderTools: Record<string, unknown> = {};
	for (const name of builderToolNames) {
		const tool = (allTools as Record<string, unknown>)[name];
		if (tool) builderTools[name] = tool;
	}

	const agentId = 'eval-builder-' + nanoid(6);
	const agent = new Agent({
		id: agentId,
		name: 'Eval Workflow Builder',
		instructions: {
			role: 'system' as const,
			content: BUILDER_AGENT_PROMPT,
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' as const } },
			},
		},
		model: modelId,
		tools: builderTools,
	});

	// Register with Mastra so HITL-suspending tools can persist a snapshot
	// and `resumeStream` can pick it back up on auto-approve.
	const mastraStorage = new InMemoryStore({ id: 'eval-' + nanoid(6) });
	registerWithMastra(agentId, agent, mastraStorage);

	const abortController = new AbortController();
	const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);
	const threadId = 'eval-thread-' + nanoid(6);
	const runId = 'eval-run-' + nanoid(6);
	const eventBus = wrapEventBusWithObserver(createInMemoryEventBus(), (event) => {
		observeEvent(event, interactivity);
		chunkLog?.writeEvent(event);
	});
	const logger = silentLogger();

	let finalText: string | undefined;
	try {
		const streamSource = await agent.stream(options.prompt, {
			maxSteps,
			abortSignal: abortController.signal,
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' as const } },
			},
		});

		const result = await executeResumableStream({
			agent: asResumable(agent),
			stream: streamSource,
			context: {
				threadId,
				runId,
				agentId: 'eval-builder',
				eventBus,
				signal: abortController.signal,
				logger,
			},
			control: {
				mode: 'auto',
				waitForConfirmation: async (requestId): Promise<Record<string, unknown>> => {
					interactivity.autoApprovedSuspensions++;
					chunkLog?.write({ kind: 'auto-approve', requestId });
					return { approved: true };
				},
				onSuspension: (suspension) => {
					chunkLog?.write({ kind: 'suspension', ...suspension });
					if (suspension.toolName === 'ask-user') {
						interactivity.askUserCount++;
					}
				},
			},
		});

		if (result.text) {
			finalText = await result.text;
		}
		// Pull stream-level totals when the underlying Mastra source exposes
		// them. `finishReason === 'length'` / 'tool-calls' pinpoints
		// maxSteps exhaustion, and `totalUsage` is our only cost signal.
		const usage = await safeSettle(streamSource.totalUsage ?? streamSource.usage);
		const finishReason = await safeSettle(streamSource.finishReason);
		chunkLog?.write({
			kind: 'stream-finish',
			status: result.status,
			finishReason,
			usage,
		});
		if (finalText) chunkLog?.write({ kind: 'final-text', text: finalText });

		if (abortController.signal.aborted || result.status === 'cancelled') {
			await chunkLog?.close();
			return failResult(
				started,
				'build_timeout',
				new Error(`Build exceeded ${timeoutMs}ms`),
				interactivity,
				finalText,
			);
		}
		if (result.status === 'errored') {
			await chunkLog?.close();
			return failResult(
				started,
				'agent_error',
				new Error('Stream errored'),
				interactivity,
				finalText,
			);
		}
	} catch (error) {
		chunkLog?.write({
			kind: 'error',
			stage: 'stream',
			message: error instanceof Error ? error.message : String(error),
		});
		if (abortController.signal.aborted) {
			await chunkLog?.close();
			return failResult(
				started,
				'build_timeout',
				new Error(`Build exceeded ${timeoutMs}ms`),
				interactivity,
				finalText,
			);
		}
		await chunkLog?.close();
		return failResult(started, 'agent_error', error, interactivity, finalText);
	} finally {
		clearTimeout(timeoutHandle);
	}

	const captured = services.capturedWorkflows;
	chunkLog?.write({ kind: 'captured-workflows', count: captured.length });
	if (captured.length === 0) {
		await chunkLog?.close();
		return failResult(
			started,
			'no_workflow_built',
			new Error('Builder finished without invoking build-workflow'),
			interactivity,
			finalText,
		);
	}

	const [first, ...extras] = captured.map(normalizeWorkflow);
	await chunkLog?.close();

	return {
		success: true,
		workflow: first,
		extraWorkflows: extras,
		durationMs: Date.now() - started,
		finalText,
		interactivity: {
			askUserCount: interactivity.askUserCount,
			planToolCount: interactivity.planToolCount,
			autoApprovedSuspensions: interactivity.autoApprovedSuspensions,
			mockedCredentialTypes: Array.from(interactivity.mockedCredentialTypes),
		},
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface InteractivityState {
	askUserCount: number;
	planToolCount: number;
	autoApprovedSuspensions: number;
	mockedCredentialTypes: Set<string>;
}

function observeEvent(event: InstanceAiEvent, interactivity: InteractivityState): void {
	if (event.type === 'tool-call') {
		const payload: unknown = event.payload;
		if (!isRecord(payload)) return;
		const toolName = typeof payload.toolName === 'string' ? payload.toolName : undefined;
		if (toolName === 'plan') interactivity.planToolCount++;
	} else if (event.type === 'tool-result') {
		const payload: unknown = event.payload;
		if (!isRecord(payload)) return;
		const result = isRecord(payload.result) ? payload.result : undefined;
		const mocked = result?.mockedCredentialTypes;
		if (Array.isArray(mocked)) {
			for (const type of mocked) {
				if (typeof type === 'string') interactivity.mockedCredentialTypes.add(type);
			}
		}
	}
}

function failResult(
	startedAt: number,
	errorClass: BuildErrorClass,
	error: unknown,
	interactivity: InteractivityState,
	finalText?: string,
): InProcessBuildResult {
	return {
		success: false,
		extraWorkflows: [],
		errorClass,
		errorMessage: error instanceof Error ? error.message : String(error),
		durationMs: Date.now() - startedAt,
		finalText,
		interactivity: {
			askUserCount: interactivity.askUserCount,
			planToolCount: interactivity.planToolCount,
			autoApprovedSuspensions: interactivity.autoApprovedSuspensions,
			mockedCredentialTypes: Array.from(interactivity.mockedCredentialTypes),
		},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function silentLogger(): Logger {
	return { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
}

// ---------------------------------------------------------------------------
// In-memory event bus — the stream executor publishes mapped events here.
// ---------------------------------------------------------------------------

function createInMemoryEventBus(): InstanceAiEventBus {
	const storeByThread = new Map<string, StoredEvent[]>();
	const subscribersByThread = new Map<string, Array<(event: StoredEvent) => void>>();

	return {
		publish(threadId, event) {
			const list = storeByThread.get(threadId) ?? [];
			const stored: StoredEvent = { id: list.length + 1, event };
			list.push(stored);
			storeByThread.set(threadId, list);
			const subs = subscribersByThread.get(threadId);
			if (subs) for (const sub of subs) sub(stored);
		},
		subscribe(threadId, handler) {
			const subs = subscribersByThread.get(threadId) ?? [];
			subs.push(handler);
			subscribersByThread.set(threadId, subs);
			return () => {
				const current = subscribersByThread.get(threadId) ?? [];
				subscribersByThread.set(
					threadId,
					current.filter((h) => h !== handler),
				);
			};
		},
		getEventsAfter(threadId, afterId) {
			return (storeByThread.get(threadId) ?? []).filter((e) => e.id > afterId);
		},
		getEventsForRun(threadId, runId) {
			return (storeByThread.get(threadId) ?? [])
				.map((e) => e.event)
				.filter((e) => 'runId' in e && e.runId === runId);
		},
		getEventsForRuns(threadId, runIds) {
			const set = new Set(runIds);
			return (storeByThread.get(threadId) ?? [])
				.map((e) => e.event)
				.filter((e) => 'runId' in e && set.has(e.runId));
		},
		getNextEventId(threadId) {
			return (storeByThread.get(threadId) ?? []).length + 1;
		},
	};
}

function wrapEventBusWithObserver(
	bus: InstanceAiEventBus,
	observe: (event: InstanceAiEvent) => void,
): InstanceAiEventBus {
	return {
		...bus,
		publish(threadId, event) {
			observe(event);
			bus.publish(threadId, event);
		},
	};
}

// ---------------------------------------------------------------------------
// Chunk log — writes one JSONL record per observed event to a file so
// failures can be diagnosed after the fact.
// ---------------------------------------------------------------------------

interface ChunkLog {
	writeHeader(
		prompt: string,
		config: { modelId: ModelConfig; maxSteps: number; timeoutMs: number },
	): void;
	writeEvent(event: InstanceAiEvent): void;
	write(record: Record<string, unknown>): void;
	close(): Promise<void>;
}

async function openChunkLog(filePath: string): Promise<ChunkLog> {
	await mkdir(path.dirname(filePath), { recursive: true });
	const stream: WriteStream = createWriteStream(filePath, { flags: 'w' });

	const emit = (obj: Record<string, unknown>): void => {
		stream.write(JSON.stringify({ t: new Date().toISOString(), ...obj }) + '\n');
	};

	// Pair tool-call ↔ tool-result so we can surface per-call latency.
	const toolCallStarts = new Map<string, { started: number; toolName: string }>();

	// Accumulate text/reasoning deltas so we log one compact "text" record
	// per run rather than hundreds of noise records. Flush on step boundaries,
	// tool calls, and stream end.
	let textBuf = '';
	let reasoningBuf = '';
	const flushText = (): void => {
		if (textBuf.length > 0) {
			emit({ kind: 'text', length: textBuf.length, text: textBuf });
			textBuf = '';
		}
		if (reasoningBuf.length > 0) {
			emit({ kind: 'reasoning', length: reasoningBuf.length, text: reasoningBuf });
			reasoningBuf = '';
		}
	};

	let toolCallIdx = 0;

	return {
		writeHeader(prompt, config) {
			emit({
				kind: 'start',
				modelId: typeof config.modelId === 'string' ? config.modelId : '<non-string>',
				maxSteps: config.maxSteps,
				timeoutMs: config.timeoutMs,
				prompt,
			});
		},
		writeEvent(event) {
			// --- Tool lifecycle (with timing) -------------------------------
			if (event.type === 'tool-call' && isRecord(event.payload)) {
				flushText();
				toolCallIdx += 1;
				const toolCallId =
					typeof event.payload.toolCallId === 'string' ? event.payload.toolCallId : '';
				const toolName =
					typeof event.payload.toolName === 'string' ? event.payload.toolName : '<unknown>';
				if (toolCallId) toolCallStarts.set(toolCallId, { started: Date.now(), toolName });
				emit({
					kind: 'tool-call',
					step: toolCallIdx,
					runId: event.runId,
					agentId: event.agentId,
					toolName,
					toolCallId,
					args: truncate(event.payload.args, 2000),
				});
			} else if (event.type === 'tool-result' && isRecord(event.payload)) {
				const toolCallId =
					typeof event.payload.toolCallId === 'string' ? event.payload.toolCallId : '';
				const start = toolCallId ? toolCallStarts.get(toolCallId) : undefined;
				const elapsedMs = start ? Date.now() - start.started : undefined;
				if (toolCallId) toolCallStarts.delete(toolCallId);
				emit({
					kind: 'tool-result',
					runId: event.runId,
					toolCallId,
					toolName: start?.toolName,
					elapsedMs,
					result: truncate(event.payload.result, 2000),
				});
			} else if (event.type === 'tool-error' && isRecord(event.payload)) {
				const toolCallId =
					typeof event.payload.toolCallId === 'string' ? event.payload.toolCallId : '';
				const start = toolCallId ? toolCallStarts.get(toolCallId) : undefined;
				const elapsedMs = start ? Date.now() - start.started : undefined;
				if (toolCallId) toolCallStarts.delete(toolCallId);
				emit({
					kind: 'tool-error',
					runId: event.runId,
					toolCallId,
					toolName: start?.toolName,
					elapsedMs,
					error: truncate(event.payload.error, 2000),
				});
			}
			// --- Model output (buffered) ------------------------------------
			else if (event.type === 'text-delta' && isRecord(event.payload)) {
				if (typeof event.payload.text === 'string') textBuf += event.payload.text;
			} else if (event.type === 'reasoning-delta' && isRecord(event.payload)) {
				if (typeof event.payload.text === 'string') reasoningBuf += event.payload.text;
			}
			// --- HITL / confirmations ---------------------------------------
			else if (event.type === 'confirmation-request') {
				flushText();
				emit({ kind: 'confirmation-request', payload: event.payload });
			}
			// --- Agent / run lifecycle --------------------------------------
			else if (event.type === 'agent-spawned' || event.type === 'run-start') {
				emit({ kind: event.type, payload: event.payload });
			} else if (event.type === 'agent-completed' || event.type === 'run-finish') {
				flushText();
				emit({ kind: event.type, payload: event.payload });
			}
			// --- Errors / status --------------------------------------------
			else if (event.type === 'error' && isRecord(event.payload)) {
				flushText();
				emit({
					kind: 'stream-error',
					content: event.payload.content,
					statusCode: event.payload.statusCode,
					provider: event.payload.provider,
					technicalDetails: truncate(event.payload.technicalDetails, 2000),
				});
			} else if (event.type === 'status' && isRecord(event.payload)) {
				emit({ kind: 'status', message: event.payload.message });
			} else if (event.type === 'tasks-update') {
				emit({ kind: 'tasks-update', payload: event.payload });
			} else {
				// Compact catch-all for less-common events — keeps file readable.
				emit({ kind: event.type });
			}
		},
		write(record) {
			// Ensure any pending text is flushed before synthetic records so
			// the order in the file reflects when things actually happened.
			flushText();
			emit(record);
		},
		async close() {
			flushText();
			// Any tool calls still unpaired at close are logged so a silent
			// mid-stream drop doesn't leave `toolCallStarts` ghosts invisible.
			for (const [id, info] of toolCallStarts.entries()) {
				emit({
					kind: 'tool-call-unresolved',
					toolCallId: id,
					toolName: info.toolName,
					elapsedMs: Date.now() - info.started,
				});
			}
			emit({ kind: 'log-end', totalToolCalls: toolCallIdx });
			await new Promise<void>((resolve) => stream.end(() => resolve()));
		},
	};
}

function truncate(value: unknown, max: number): unknown {
	if (value === null || value === undefined) return value;
	try {
		const str = typeof value === 'string' ? value : JSON.stringify(value);
		if (str.length <= max) return value;
		return str.substring(0, max) + '... [truncated]';
	} catch {
		return '<unserializable>';
	}
}

/** Await an optional promise without letting a rejection propagate. */
async function safeSettle<T>(value: Promise<T> | undefined): Promise<T | undefined> {
	if (!value) return undefined;
	try {
		return await value;
	} catch {
		return undefined;
	}
}
