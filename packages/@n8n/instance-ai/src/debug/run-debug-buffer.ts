import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import type { OnStepFinishEvent, OnStepStartEvent } from 'ai';

import type { Logger } from '../logger';
import { sanitizeDebugSnapshotRecord, sanitizeDebugSnapshotValue } from './sanitize-debug-snapshot';

const MAX_RUNS = 50;
const MAX_STEPS_PER_RUN = 200;
const MAX_WORKFLOW_SNAPSHOTS_PER_RUN = 100;

export interface WorkflowCodeSnapshotInput {
	code: string;
	source: 'full-code' | 'patch';
	patches?: unknown;
	workflowId?: string;
	toolCallId?: string;
	success: boolean;
	errors?: string[];
	capturedAt: number;
}

export type SanitizedStepStart = {
	stepNumber: number;
	sdkStepNumber?: number;
} & Record<string, unknown>;

export type SanitizedStepFinish = {
	stepNumber: number;
	sdkStepNumber?: number;
} & Record<string, unknown>;

export type WorkflowCodeSnapshot = WorkflowCodeSnapshotInput;

export interface RunDebugStep {
	stepNumber: number;
	input?: SanitizedStepStart;
	output?: SanitizedStepFinish;
}

export interface RunDebugRecord {
	threadId: string;
	runId: string;
	startedAt: number;
	label?: string;
	/** Next run-scoped step index; survives step-cap eviction. */
	nextStepIndex: number;
	steps: RunDebugStep[];
	workflowCode: WorkflowCodeSnapshot[];
}

export interface RunDebugStepHookOptions {
	runId: string;
	threadId: string;
}

function captureStepStartPayload(event: OnStepStartEvent): Record<string, unknown> {
	const { abortSignal: _abortSignal, ...capturable } = event;
	return sanitizeDebugSnapshotRecord(capturable);
}

function captureStepFinishPayload(event: OnStepFinishEvent): Record<string, unknown> {
	return sanitizeDebugSnapshotRecord(event);
}

export function sanitizeStepStart(event: OnStepStartEvent, stepNumber: number): SanitizedStepStart {
	return {
		...captureStepStartPayload(event),
		stepNumber,
		sdkStepNumber: event.stepNumber,
	};
}

export function sanitizeStepFinish(
	event: OnStepFinishEvent,
	stepNumber: number,
): SanitizedStepFinish {
	return {
		...captureStepFinishPayload(event),
		stepNumber,
		sdkStepNumber: event.stepNumber,
	};
}

export function createRunDebugStepHooks(
	buffer: RunDebugBuffer,
	options: RunDebugStepHookOptions,
): {
	onStepStart: (event: OnStepStartEvent) => void;
	onStepFinish: (event: OnStepFinishEvent) => void;
} {
	// The agent runtime calls streamText/generateText once per loop iteration. The AI SDK
	// resets stepNumber to 0 on each call, so we allocate a run-scoped sequence instead.
	let stepIndex = buffer.getNextStepIndex(options.runId);

	return {
		onStepStart: (event) => {
			buffer.recordStepStart(options.runId, stepIndex, event);
		},
		onStepFinish: (event) => {
			buffer.recordStepFinish(options.runId, stepIndex, event);
			stepIndex++;
		},
	};
}

export function buildRunDebugLabel(options: {
	message?: string;
	resumeReason?: string;
}): string {
	const resumeLabels: Record<string, string> = {
		approval: 'Resume · approval',
		background_task_completed: 'Follow-up · background task completed',
		workflow_verification: 'Follow-up · workflow verification',
		workflow_setup: 'Follow-up · workflow setup',
		planned_checkpoint: 'Follow-up · planned checkpoint',
		replan: 'Follow-up · replan',
		synthesize: 'Follow-up · synthesize',
	};

	if (options.resumeReason && resumeLabels[options.resumeReason]) {
		return resumeLabels[options.resumeReason];
	}

	const trimmed = options.message?.trim();
	if (trimmed) {
		return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
	}

	return 'Orchestrator run';
}

export class RunDebugBuffer {
	private readonly records = new Map<string, RunDebugRecord>();

	constructor(private readonly logger?: Logger) {}

	ensure(runId: string, threadId: string, label?: string): void {
		if (this.records.has(runId)) return;

		this.evictOldestRunIfNeeded();
		this.records.set(runId, {
			threadId,
			runId,
			startedAt: Date.now(),
			label: label ? scrubSecretsInText(label.trim()) : undefined,
			nextStepIndex: 0,
			steps: [],
			workflowCode: [],
		});
	}

	getNextStepIndex(runId: string): number {
		return this.records.get(runId)?.nextStepIndex ?? 0;
	}

	recordStepStart(runId: string, stepIndex: number, event: OnStepStartEvent): void {
		const record = this.records.get(runId);
		if (!record) return;

		const existing = record.steps.find((step) => step.stepNumber === stepIndex);
		if (existing) {
			existing.input = sanitizeStepStart(event, stepIndex);
			return;
		}

		this.evictOldestStepIfNeeded(record);
		record.steps.push({
			stepNumber: stepIndex,
			input: sanitizeStepStart(event, stepIndex),
		});
		record.steps.sort((a, b) => a.stepNumber - b.stepNumber);
	}

	recordStepFinish(runId: string, stepIndex: number, event: OnStepFinishEvent): void {
		const record = this.records.get(runId);
		if (!record) return;

		const existing = record.steps.find((step) => step.stepNumber === stepIndex);
		if (existing) {
			existing.output = sanitizeStepFinish(event, stepIndex);
			record.nextStepIndex = stepIndex + 1;
			return;
		}

		this.evictOldestStepIfNeeded(record);
		record.steps.push({
			stepNumber: stepIndex,
			output: sanitizeStepFinish(event, stepIndex),
		});
		record.steps.sort((a, b) => a.stepNumber - b.stepNumber);
		record.nextStepIndex = stepIndex + 1;
	}

	recordWorkflowCode(runId: string, snapshot: WorkflowCodeSnapshotInput): void {
		const record = this.records.get(runId);
		if (!record) return;

		if (record.workflowCode.length >= MAX_WORKFLOW_SNAPSHOTS_PER_RUN) {
			record.workflowCode.shift();
			this.logger?.warn('Evicted oldest workflow code snapshot from run debug buffer', {
				runId,
				maxSnapshots: MAX_WORKFLOW_SNAPSHOTS_PER_RUN,
			});
		}

		record.workflowCode.push({
			...snapshot,
			code: scrubSecretsInText(snapshot.code),
			patches: sanitizeDebugSnapshotValue(snapshot.patches),
			errors: snapshot.errors?.map((error) => scrubSecretsInText(error)),
		});
	}

	get(runId: string): RunDebugRecord | undefined {
		const record = this.records.get(runId);
		if (!record) return undefined;
		return structuredClone(record);
	}

	listByThread(threadId: string): RunDebugRecord[] {
		return [...this.records.values()]
			.filter((record) => record.threadId === threadId)
			.sort((a, b) => a.startedAt - b.startedAt)
			.map((record) => structuredClone(record));
	}

	private evictOldestRunIfNeeded(): void {
		if (this.records.size < MAX_RUNS) return;

		const oldest = [...this.records.values()].sort((a, b) => a.startedAt - b.startedAt)[0];
		if (!oldest) return;

		this.records.delete(oldest.runId);
		this.logger?.warn('Evicted oldest run from debug buffer', {
			runId: oldest.runId,
			threadId: oldest.threadId,
			maxRuns: MAX_RUNS,
		});
	}

	private evictOldestStepIfNeeded(record: RunDebugRecord): void {
		if (record.steps.length < MAX_STEPS_PER_RUN) return;

		const removed = record.steps.shift();
		this.logger?.warn('Evicted oldest step from run debug buffer', {
			runId: record.runId,
			stepNumber: removed?.stepNumber,
			maxSteps: MAX_STEPS_PER_RUN,
		});
	}
}
