import crypto from 'node:crypto';

import type { N8nClient } from '../clients/n8n-client';
import { consumeSseStream } from '../clients/sse-client';
import type { EvalLogger } from '../harness/logger';
import type { CapturedEvent } from '../types';
import type {
	EvalProactiveOfferCase,
	EvalProactiveOfferCaseResult,
	EvalProactiveOfferFinding,
} from './types';

const SSE_SETTLE_DELAY_MS = 200;
const POLL_INTERVAL_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 600_000;
const CONFIRMATION_MAX_RETRIES = 5;
const OFFER_MESSAGE_PREFIX = 'Generate an eval suite for';

export interface EvalProactiveOfferRunnerConfig {
	client: N8nClient;
	testCase: EvalProactiveOfferCase;
	logger: EvalLogger;
	timeoutMs?: number;
	keepArtifacts?: boolean;
}

type ConfirmationClient = Pick<N8nClient, 'confirmAction'>;
type SseClient = Pick<N8nClient, 'getEventsUrl' | 'cookie'>;
type ThreadStatusClient = Pick<N8nClient, 'getThreadStatus' | 'confirmAction'>;

export async function delay(ms: number): Promise<void> {
	return await new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractConfirmationRequestId(event: CapturedEvent): string | undefined {
	if (typeof event.data.requestId === 'string') return event.data.requestId;
	const payload = event.data.payload;
	if (isRecord(payload) && typeof payload.requestId === 'string') return payload.requestId;
	return undefined;
}

export function extractConfirmationMessage(event: CapturedEvent): string | undefined {
	if (typeof event.data.message === 'string') return event.data.message;
	const payload = event.data.payload;
	if (isRecord(payload) && typeof payload.message === 'string') return payload.message;
	return undefined;
}

export function isEvalOfferConfirmation(event: CapturedEvent): boolean {
	if (event.type !== 'confirmation-request') return false;
	const message = extractConfirmationMessage(event);
	return typeof message === 'string' && message.startsWith(OFFER_MESSAGE_PREFIX);
}

/**
 * Walk the SSE event log to find a workflow id created during the run.
 * The build agent emits a `<background-task-completed>` event whose payload
 * contains an `outcome` object with the new workflow id.
 */
export function findCreatedWorkflowId(events: CapturedEvent[]): string | undefined {
	for (const event of events) {
		const candidate = extractWorkflowIdFromEvent(event);
		if (candidate !== undefined) return candidate;
	}
	return undefined;
}

function extractWorkflowIdFromEvent(event: CapturedEvent): string | undefined {
	const seen = new WeakSet<object>();
	const stack: unknown[] = [event.data];

	while (stack.length > 0) {
		const value = stack.pop();
		if (!isRecord(value) && !Array.isArray(value)) continue;
		if (seen.has(value)) continue;
		seen.add(value);

		if (Array.isArray(value)) {
			for (const item of value) stack.push(item);
			continue;
		}

		const outcome = value.outcome;
		if (
			isRecord(outcome) &&
			typeof outcome.workflowId === 'string' &&
			outcome.workflowId.length > 0
		) {
			return outcome.workflowId;
		}

		for (const child of Object.values(value)) stack.push(child);
	}

	return undefined;
}

export async function startSseConnection(
	client: SseClient,
	threadId: string,
	events: CapturedEvent[],
	signal: AbortSignal,
): Promise<void> {
	await consumeSseStream(
		client.getEventsUrl(threadId),
		client.cookie,
		(event) => {
			try {
				const data: unknown = JSON.parse(event.data);
				if (!isRecord(data)) return;
				events.push({
					timestamp: Date.now(),
					type: typeof data.type === 'string' ? data.type : (event.type ?? 'unknown'),
					data,
				});
			} catch {
				// SSE can include transient non-JSON payloads; skip.
			}
		},
		signal,
	);
}

interface ProcessConfirmationsState {
	processedRequestIds: Set<string>;
	retryCounts: Map<string, number>;
	offerDetected: boolean;
}

/**
 * Auto-respond to every `confirmation-request` event in the captured stream:
 * - eval offer widget → DENY (we are testing detection, not actually generating)
 * - everything else  → APPROVE (so the build can proceed)
 *
 * Mutates `state.offerDetected` to true the first time the eval offer is seen.
 */
export async function processConfirmations(input: {
	client: ConfirmationClient;
	events: CapturedEvent[];
	state: ProcessConfirmationsState;
	logger: EvalLogger;
}): Promise<void> {
	for (const event of input.events) {
		if (event.type !== 'confirmation-request') continue;

		const requestId = extractConfirmationRequestId(event);
		if (!requestId || input.state.processedRequestIds.has(requestId)) continue;

		const retryCount = input.state.retryCounts.get(requestId) ?? 0;
		if (retryCount >= CONFIRMATION_MAX_RETRIES) continue;

		const isOffer = isEvalOfferConfirmation(event);
		const approved = !isOffer;

		if (isOffer) {
			input.state.offerDetected = true;
			input.logger.verbose(`[offer-detected] requestId=${requestId} — auto-denying`);
		}

		try {
			await input.client.confirmAction(requestId, { kind: 'approval', approved });
			input.state.processedRequestIds.add(requestId);
			input.state.retryCounts.delete(requestId);
		} catch (error) {
			input.state.retryCounts.set(requestId, retryCount + 1);
			const message = error instanceof Error ? error.message : String(error);
			input.logger.verbose(
				`[confirmation] Failed to respond to ${requestId} (attempt ${String(
					retryCount + 1,
				)}/${String(CONFIRMATION_MAX_RETRIES)}): ${message}`,
			);
		}
	}
}

export async function waitForThreadToSettle(input: {
	client: ThreadStatusClient;
	threadId: string;
	events: CapturedEvent[];
	state: ProcessConfirmationsState;
	logger: EvalLogger;
	timeoutMs: number;
	getStreamError?: () => unknown;
}): Promise<void> {
	const deadline = Date.now() + input.timeoutMs;

	while (Date.now() <= deadline) {
		throwIfStreamFailed(input.getStreamError?.());
		await processConfirmations({
			client: input.client,
			events: input.events,
			state: input.state,
			logger: input.logger,
		});
		throwIfStreamFailed(input.getStreamError?.());

		const status = await input.client.getThreadStatus(input.threadId);
		const runningBackgroundTasks = status.backgroundTasks.filter(
			(task) => task.status === 'running',
		);

		if (!status.hasActiveRun && !status.isSuspended && runningBackgroundTasks.length === 0) {
			await delay(SSE_SETTLE_DELAY_MS);
			await processConfirmations({
				client: input.client,
				events: input.events,
				state: input.state,
				logger: input.logger,
			});
			throwIfStreamFailed(input.getStreamError?.());
			const stableStatus = await input.client.getThreadStatus(input.threadId);
			const stableRunningBackgroundTasks = stableStatus.backgroundTasks.filter(
				(task) => task.status === 'running',
			);

			if (
				!stableStatus.hasActiveRun &&
				!stableStatus.isSuspended &&
				stableRunningBackgroundTasks.length === 0
			) {
				return;
			}
		}

		await delay(POLL_INTERVAL_MS);
	}

	throw new Error(
		`Timed out after ${String(input.timeoutMs)}ms waiting for thread ${input.threadId} to settle`,
	);
}

export async function runEvalProactiveOfferCase(
	config: EvalProactiveOfferRunnerConfig,
): Promise<EvalProactiveOfferCaseResult> {
	const { client, testCase, logger } = config;
	const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const events: CapturedEvent[] = [];
	const state: ProcessConfirmationsState = {
		processedRequestIds: new Set<string>(),
		retryCounts: new Map<string, number>(),
		offerDetected: false,
	};
	const abortController = new AbortController();
	let streamPromise: Promise<void> | undefined;
	let streamError: unknown;
	let workflowId: string | undefined;
	let threadId: string | undefined;
	let threadSettled = false;

	try {
		threadId = `eval-proactive-offer-${crypto.randomUUID()}`;
		streamPromise = startSseConnection(client, threadId, events, abortController.signal).catch(
			(error) => {
				streamError = error;
			},
		);
		await delay(SSE_SETTLE_DELAY_MS);
		throwIfStreamFailed(streamError);

		await client.sendMessage(threadId, testCase.prompt);

		await waitForThreadToSettle({
			client,
			threadId,
			events,
			state,
			logger,
			timeoutMs,
			getStreamError: () => streamError,
		});
		threadSettled = true;

		abortController.abort();
		await streamPromise;
		throwIfStreamFailed(streamError);

		workflowId = findCreatedWorkflowId(events);
		const findings: EvalProactiveOfferFinding[] = [];

		if (workflowId === undefined) {
			findings.push({
				severity: 'error',
				code: 'workflow_not_built',
				message:
					'No workflow id surfaced from the build outcome — the build did not complete (test cannot verify offer behavior).',
			});
		} else if (testCase.expectsOffer && !state.offerDetected) {
			findings.push({
				severity: 'error',
				code: 'offer_widget_missing',
				message:
					'Workflow built but Instance AI did not surface the eval offer widget (`Generate an eval suite for ...`) before settling.',
			});
		} else if (!testCase.expectsOffer && state.offerDetected) {
			findings.push({
				severity: 'error',
				code: 'unexpected_offer_widget',
				message:
					'Workflow does not need evals (no AI nodes expected) but Instance AI surfaced the eval offer widget anyway.',
			});
		}

		return {
			caseSlug: testCase.slug,
			prompt: testCase.prompt,
			expectsOffer: testCase.expectsOffer,
			offerDetected: state.offerDetected,
			workflowBuilt: workflowId !== undefined,
			...(workflowId === undefined ? {} : { workflowId }),
			findings,
			passed: findings.length === 0,
		};
	} catch (error) {
		abortController.abort();
		if (threadId && !threadSettled) {
			await client.cancelRun(threadId).catch((cancelError) => {
				const cancelMessage =
					cancelError instanceof Error ? cancelError.message : String(cancelError);
				logger.verbose(`Failed to cancel thread ${threadId}: ${cancelMessage}`);
			});
		}
		if (streamPromise) {
			await streamPromise.catch((cleanupError) => {
				const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
				logger.verbose(`SSE stream ended with error during failure handling: ${message}`);
			});
		}

		const message = error instanceof Error ? error.message : String(error);
		return {
			caseSlug: testCase.slug,
			prompt: testCase.prompt,
			expectsOffer: testCase.expectsOffer,
			offerDetected: state.offerDetected,
			workflowBuilt: workflowId !== undefined,
			...(workflowId === undefined ? {} : { workflowId }),
			findings: [{ severity: 'error', code: 'runner_error', message }],
			passed: false,
			error: message,
		};
	} finally {
		abortController.abort();
		if (streamPromise) {
			await streamPromise.catch((error) => {
				const message = error instanceof Error ? error.message : String(error);
				logger.verbose(`SSE cleanup error: ${message}`);
			});
		}

		if (!config.keepArtifacts && workflowId) {
			await client.deleteWorkflow(workflowId).catch((error) => {
				const message = error instanceof Error ? error.message : String(error);
				logger.verbose(`Failed to clean up workflow ${workflowId}: ${message}`);
			});
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwIfStreamFailed(error: unknown): void {
	if (error) throw error;
}
