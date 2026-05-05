// ---------------------------------------------------------------------------
// Plan capture helper.
//
// Drives a live n8n instance with a prompt and captures the orchestrator
// plan that the planner sub-agent submits — the same `PlannedTask[]` that
// `submit-plan` hands to `PlannedTaskService.createPlan()`.
//
// We listen on SSE, accumulate `add-plan-item` tool-call args (so we can
// expose the rich `BlueprintWorkflowItem` shape later as metadata), track
// the latest reconciled `tasks-update.planItems`, and stop the moment the
// planner suspends with `inputType: 'plan-review'` — the canonical plan-
// submission boundary. We decline that confirmation and cancel the run so
// the instance doesn't dispatch tasks.
//
// Other confirmation-requests during planning (e.g. `ask-user` from the
// planner) are auto-resolved with neutral payloads to keep the planner
// progressing toward submit-plan.
// ---------------------------------------------------------------------------

import type { InstanceAiConfirmRequest, PlannedTaskArg } from '@n8n/api-types';
import crypto from 'node:crypto';

import type { EvalLogger } from './logger';
import type {
	BlueprintCheckpointItem,
	BlueprintDataTableItem,
	BlueprintDelegateItem,
	BlueprintResearchItem,
	BlueprintWorkflowItem,
	PlanningBlueprint,
} from '../../src/tools/orchestration/blueprint.schema';
import type { N8nClient } from '../clients/n8n-client';
import { consumeSseStream } from '../clients/sse-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanCaptureFailureReason =
	| 'timeout'
	| 'no-plan-emitted'
	| 'sse-error'
	| 'send-message-failed';

export class PlanCaptureFailedError extends Error {
	readonly parentExampleId: string;

	readonly reason: PlanCaptureFailureReason;

	constructor(parentExampleId: string, reason: PlanCaptureFailureReason, message?: string) {
		super(message ?? `plan capture failed for ${parentExampleId}: ${reason}`);
		this.name = 'PlanCaptureFailedError';
		this.parentExampleId = parentExampleId;
		this.reason = reason;
	}
}

export interface CapturedPlan {
	parentExampleId: string;
	parentPrompt: string;
	threadId: string;
	blueprint: PlanningBlueprint;
	plannedTasks: PlannedTaskArg[];
}

export interface CapturePlanOptions {
	client: N8nClient;
	parentExampleId: string;
	prompt: string;
	timeoutMs: number;
	logger: EvalLogger;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SSE_SETTLE_DELAY_MS = 200;
const POLL_INTERVAL_MS = 250;

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/**
 * Drive `prompt` through the orchestrator and capture the submitted plan.
 *
 * Returns when the planner reaches `submit-plan` (suspending with
 * `inputType: 'plan-review'`). Throws `PlanCaptureFailedError` on timeout
 * or if the SSE stream errors out before a plan is emitted.
 *
 * The thread is cancelled before return so the n8n instance doesn't try
 * to dispatch tasks against an unapproved plan.
 */
export async function capturePlanFromPrompt(opts: CapturePlanOptions): Promise<CapturedPlan> {
	const { client, parentExampleId, prompt, timeoutMs, logger } = opts;
	const threadId = `eval-plan-capture-${crypto.randomUUID()}`;
	const abortController = new AbortController();

	const accumulator = new BlueprintBookkeeper();
	let latestPlanItems: PlannedTaskArg[] | undefined;
	let captured = false;
	let captureError: Error | undefined;

	logger.verbose(`[${parentExampleId}] capturing plan via thread ${threadId}`);

	const ssePromise = consumeSseStream(
		client.getEventsUrl(threadId),
		client.cookie,
		(sseEvent) => {
			if (captured) return;
			let parsed: unknown;
			try {
				parsed = JSON.parse(sseEvent.data);
			} catch {
				return;
			}
			if (!isInstanceAiEventLike(parsed)) return;

			switch (parsed.type) {
				case 'tool-call':
					handleToolCall(parsed, accumulator);
					break;
				case 'tasks-update': {
					const planItems = readPlanItems(parsed);
					if (planItems) latestPlanItems = planItems;
					break;
				}
				case 'confirmation-request':
					void handleConfirmation(parsed, client, logger).then((result) => {
						if (result === 'plan-review') {
							captured = true;
						}
					});
					break;
				case 'run-finish':
					// Planner finished without a plan-review confirmation —
					// either it errored out or never called submit-plan.
					if (latestPlanItems === undefined) {
						captureError = new PlanCaptureFailedError(
							parentExampleId,
							'no-plan-emitted',
							'planner finished without emitting a plan-review confirmation',
						);
					}
					captured = true;
					break;
				default:
					// Other event types are ignored.
					break;
			}
		},
		abortController.signal,
	).catch((error: unknown) => {
		// SSE errors are recorded so the polling loop can surface them.
		captureError = error instanceof Error ? error : new Error(String(error));
		captured = true;
	});

	// Give SSE a beat to connect before sending the message.
	await delay(SSE_SETTLE_DELAY_MS);

	try {
		await client.sendMessage(threadId, prompt);
	} catch (error) {
		abortController.abort();
		await ssePromise;
		throw new PlanCaptureFailedError(
			parentExampleId,
			'send-message-failed',
			error instanceof Error ? error.message : String(error),
		);
	}

	const deadline = Date.now() + timeoutMs;
	while (!captured && Date.now() < deadline) {
		await delay(POLL_INTERVAL_MS);
	}

	abortController.abort();
	await ssePromise;

	// Always cancel — either we captured (don't let the instance dispatch
	// tasks against an unapproved plan) or we timed out (free the run slot).
	await client.cancelRun(threadId).catch(() => {});

	if (captureError) throw captureError;

	if (!captured) {
		throw new PlanCaptureFailedError(parentExampleId, 'timeout');
	}

	if (!latestPlanItems) {
		throw new PlanCaptureFailedError(
			parentExampleId,
			'no-plan-emitted',
			'captured before any tasks-update event arrived',
		);
	}

	return {
		parentExampleId,
		parentPrompt: prompt,
		threadId,
		blueprint: accumulator.toBlueprint(),
		plannedTasks: latestPlanItems,
	};
}

// ---------------------------------------------------------------------------
// Event handling helpers
// ---------------------------------------------------------------------------

function handleToolCall(event: InstanceAiEventLike, bookkeeper: BlueprintBookkeeper): void {
	const payload = event.payload;
	if (!isRecord(payload)) return;
	const toolName = typeof payload.toolName === 'string' ? payload.toolName : undefined;
	const args = isRecord(payload.args) ? payload.args : undefined;

	if (toolName === 'add-plan-item' && args) {
		bookkeeper.handleAdd(args);
	} else if (toolName === 'remove-plan-item' && args) {
		const id = typeof args.id === 'string' ? args.id : undefined;
		if (id) bookkeeper.handleRemove(id);
	}
}

function readPlanItems(event: InstanceAiEventLike): PlannedTaskArg[] | undefined {
	const payload = event.payload;
	if (!isRecord(payload)) return undefined;
	const planItems = payload.planItems;
	if (!Array.isArray(planItems)) return undefined;

	const valid: PlannedTaskArg[] = [];
	for (const raw of planItems) {
		if (!isRecord(raw)) continue;
		if (
			typeof raw.id !== 'string' ||
			typeof raw.title !== 'string' ||
			typeof raw.kind !== 'string' ||
			typeof raw.spec !== 'string' ||
			!Array.isArray(raw.deps)
		) {
			continue;
		}
		const deps = raw.deps.filter((d): d is string => typeof d === 'string');
		const item: PlannedTaskArg = {
			id: raw.id,
			title: raw.title,
			kind: raw.kind,
			spec: raw.spec,
			deps,
		};
		if (Array.isArray(raw.tools)) {
			item.tools = raw.tools.filter((t): t is string => typeof t === 'string');
		}
		if (typeof raw.workflowId === 'string') {
			item.workflowId = raw.workflowId;
		}
		valid.push(item);
	}
	return valid;
}

/**
 * Resolve a confirmation-request. Returns 'plan-review' when the request
 * is the plan-submission boundary (so the caller can stop), otherwise
 * 'continue' after auto-resolving with a neutral payload.
 */
async function handleConfirmation(
	event: InstanceAiEventLike,
	client: N8nClient,
	logger: EvalLogger,
): Promise<'plan-review' | 'continue'> {
	const payload = isRecord(event.payload) ? event.payload : {};
	const requestId = typeof payload.requestId === 'string' ? payload.requestId : undefined;
	if (!requestId) return 'continue';

	const inputType = typeof payload.inputType === 'string' ? payload.inputType : undefined;

	if (inputType === 'plan-review') {
		// Decline so the orchestrator unwinds cleanly without dispatching tasks.
		// `kind: 'approval'` with `approved: false` is the contract for
		// plan-review feedback per the InstanceAiConfirmRequest DTO.
		await client
			.confirmAction(requestId, {
				kind: 'approval',
				approved: false,
				userInput: 'eval-capture: declining to prevent task dispatch',
			})
			.catch((error: unknown) => {
				logger.verbose(
					`[plan-capture] decline plan-review failed: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			});
		return 'plan-review';
	}

	// Anything else: keep the planner moving with a neutral approval.
	const reply = pickNeutralConfirmation(payload);
	await client.confirmAction(requestId, reply).catch((error: unknown) => {
		logger.verbose(
			`[plan-capture] auto-confirm failed for ${requestId}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	});
	return 'continue';
}

/** Build a structurally valid InstanceAiConfirmRequest for non-plan-review confirmations. */
function pickNeutralConfirmation(payload: Record<string, unknown>): InstanceAiConfirmRequest {
	const inputType = typeof payload.inputType === 'string' ? payload.inputType : undefined;

	if (inputType === 'questions') {
		return { kind: 'questions', answers: [] };
	}
	if (inputType === 'text') {
		// Free-form text reply travels in `userInput` on the approval kind.
		return { kind: 'approval', approved: true, userInput: '' };
	}

	if (isRecord(payload.resourceDecision)) {
		const options = Array.isArray(payload.resourceDecision.options)
			? payload.resourceDecision.options.filter((o): o is string => typeof o === 'string')
			: [];
		const allow = options.find((o) => o.toLowerCase().includes('allow')) ?? options[0];
		return { kind: 'resourceDecision', resourceDecision: allow ?? 'allowOnce' };
	}
	if (isRecord(payload.domainAccess)) {
		return { kind: 'domainAccessApprove', domainAccessAction: 'allow_all' };
	}
	if (Array.isArray(payload.credentialRequests)) {
		return { kind: 'credentialSelection', credentials: {} };
	}
	if (Array.isArray(payload.setupRequests)) {
		return { kind: 'setupWorkflowApply' };
	}

	return { kind: 'approval', approved: true };
}

// ---------------------------------------------------------------------------
// Blueprint bookkeeper — mirrors what the production planner accumulates,
// without depending on the production class (which mutates state with
// kind-specific routing not exposed for read-back).
// ---------------------------------------------------------------------------

class BlueprintBookkeeper {
	private summary = '';

	private assumptions: string[] = [];

	private workflows: BlueprintWorkflowItem[] = [];

	private dataTables: BlueprintDataTableItem[] = [];

	private researchItems: BlueprintResearchItem[] = [];

	private delegateItems: BlueprintDelegateItem[] = [];

	private checkpoints: BlueprintCheckpointItem[] = [];

	handleAdd(args: Record<string, unknown>): void {
		if (typeof args.summary === 'string') this.summary = args.summary;
		if (Array.isArray(args.assumptions)) {
			this.assumptions = args.assumptions.filter((a): a is string => typeof a === 'string');
		}

		const item = isRecord(args.item) ? args.item : undefined;
		if (!item) return;
		const kind = typeof item.kind === 'string' ? item.kind : undefined;

		switch (kind) {
			case 'workflow':
				this.upsert(this.workflows, toWorkflowItem(item));
				break;
			case 'data-table':
				this.upsert(this.dataTables, toDataTableItem(item));
				break;
			case 'research':
				this.upsert(this.researchItems, toResearchItem(item));
				break;
			case 'delegate':
				this.upsert(this.delegateItems, toDelegateItem(item));
				break;
			case 'checkpoint':
				this.upsert(this.checkpoints, toCheckpointItem(item));
				break;
			default:
				// Unknown kind — drop silently; the planItems list is the
				// authoritative task source anyway.
				break;
		}
	}

	handleRemove(id: string): void {
		this.remove(this.workflows, id);
		this.remove(this.dataTables, id);
		this.remove(this.researchItems, id);
		this.remove(this.delegateItems, id);
		this.remove(this.checkpoints, id);
	}

	toBlueprint(): PlanningBlueprint {
		return {
			summary: this.summary,
			workflows: [...this.workflows],
			dataTables: [...this.dataTables],
			researchItems: [...this.researchItems],
			delegateItems: [...this.delegateItems],
			checkpointItems: [...this.checkpoints],
			assumptions: [...this.assumptions],
			openQuestions: [],
		};
	}

	private upsert<T extends { id: string }>(arr: T[], item: T): void {
		const idx = arr.findIndex((existing) => existing.id === item.id);
		if (idx >= 0) arr[idx] = item;
		else arr.push(item);
	}

	private remove<T extends { id: string }>(arr: T[], id: string): void {
		const idx = arr.findIndex((existing) => existing.id === id);
		if (idx >= 0) arr.splice(idx, 1);
	}
}

// ---------------------------------------------------------------------------
// Item coercion — the SSE payload is `unknown`, so we narrow defensively.
// We trust the production schema produced these fields, but missing data
// gets safe defaults so a malformed event doesn't kill the capture.
// ---------------------------------------------------------------------------

function toWorkflowItem(raw: Record<string, unknown>): BlueprintWorkflowItem {
	return {
		id: stringOr(raw.id, ''),
		name: stringOr(raw.name, ''),
		purpose: stringOr(raw.purpose, ''),
		integrations: stringArray(raw.integrations),
		triggerDescription:
			typeof raw.triggerDescription === 'string' ? raw.triggerDescription : undefined,
		existingWorkflowId:
			typeof raw.existingWorkflowId === 'string' ? raw.existingWorkflowId : undefined,
		dependsOn: stringArray(raw.dependsOn),
	};
}

function toDataTableItem(raw: Record<string, unknown>): BlueprintDataTableItem {
	const columnsRaw = Array.isArray(raw.columns) ? raw.columns : undefined;
	const columns = columnsRaw
		?.map((c) => {
			if (!isRecord(c)) return undefined;
			const name = typeof c.name === 'string' ? c.name : undefined;
			const type = typeof c.type === 'string' ? c.type : undefined;
			if (!name || !type) return undefined;
			if (type !== 'string' && type !== 'number' && type !== 'boolean' && type !== 'date') {
				return undefined;
			}
			return { name, type };
		})
		.filter((c): c is { name: string; type: 'string' | 'number' | 'boolean' | 'date' } => !!c);

	return {
		id: stringOr(raw.id, ''),
		name: stringOr(raw.name, ''),
		purpose: stringOr(raw.purpose, ''),
		columns,
		dependsOn: stringArray(raw.dependsOn),
	};
}

function toResearchItem(raw: Record<string, unknown>): BlueprintResearchItem {
	return {
		id: stringOr(raw.id, ''),
		question: stringOr(raw.question, ''),
		constraints: typeof raw.constraints === 'string' ? raw.constraints : undefined,
		dependsOn: stringArray(raw.dependsOn),
	};
}

function toDelegateItem(raw: Record<string, unknown>): BlueprintDelegateItem {
	return {
		id: stringOr(raw.id, ''),
		title: stringOr(raw.title, ''),
		description: stringOr(raw.description, ''),
		requiredTools: stringArray(raw.requiredTools),
		dependsOn: stringArray(raw.dependsOn),
	};
}

function toCheckpointItem(raw: Record<string, unknown>): BlueprintCheckpointItem {
	return {
		id: stringOr(raw.id, ''),
		title: stringOr(raw.title, ''),
		instructions: stringOr(raw.instructions, ''),
		dependsOn: stringArray(raw.dependsOn),
	};
}

// ---------------------------------------------------------------------------
// Local utilities
// ---------------------------------------------------------------------------

interface InstanceAiEventLike {
	type: string;
	payload?: unknown;
}

function isInstanceAiEventLike(value: unknown): value is InstanceAiEventLike {
	return isRecord(value) && typeof value.type === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOr(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback;
}

function stringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((v): v is string => typeof v === 'string');
}

async function delay(ms: number): Promise<void> {
	return await new Promise((resolve) => setTimeout(resolve, ms));
}
