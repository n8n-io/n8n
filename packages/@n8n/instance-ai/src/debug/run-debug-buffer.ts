import { isRecord } from '@n8n/utils/is-record';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import type { GenerateTextStepEndEvent, GenerateTextStepStartEvent } from 'ai';

import type { Logger } from '../logger';
import { sanitizeDebugSnapshotRecord, sanitizeDebugSnapshotValue } from './sanitize-debug-snapshot';

const MAX_RUNS = 50;
const MAX_STEPS_PER_RUN = 200;
const MAX_WORKFLOW_SNAPSHOTS_PER_RUN = 100;
const MAX_SUB_AGENTS_PER_RUN = 20;

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

/** Steps of one sub-agent turn that an orchestrator tool call started. */
export interface RunDebugSubAgent {
	/** Buffer-scoped id, unique inside the run. */
	id: string;
	/** Sub-agent role, e.g. `agent-builder`. */
	role: string;
	label?: string;
	/** Orchestrator tool call that started this sub-agent turn. */
	parentToolCallId?: string;
	/** Last orchestrator step recorded before the sub-agent started. Fallback link when no step has the tool call. */
	afterStepNumber?: number;
	startedAt: number;
	/** Next sub-agent-scoped step index; survives step-cap eviction. */
	nextStepIndex: number;
	steps: RunDebugStep[];
}

export interface RunDebugRecord {
	threadId: string;
	runId: string;
	startedAt: number;
	label?: string;
	/** Next run-scoped step index; survives step-cap eviction. */
	nextStepIndex: number;
	steps: RunDebugStep[];
	subAgents: RunDebugSubAgent[];
	workflowCode: WorkflowCodeSnapshot[];
}

export interface RunDebugStepHookOptions {
	runId: string;
	threadId: string;
}

export interface RunDebugSubAgentOptions {
	role: string;
	label?: string;
	parentToolCallId?: string;
}

export interface RunDebugStepHooks {
	onStepStart: (event: GenerateTextStepStartEvent) => void;
	onStepEnd: (event: GenerateTextStepEndEvent) => void;
}

/** Steps container shared by the orchestrator record and its sub-agents. */
interface StepContainer {
	nextStepIndex: number;
	steps: RunDebugStep[];
}

/**
 * Step-start keys that repeat data captured elsewhere:
 * - `tools` holds live Zod schemas; `stepTools` has the JSON Schema the model received.
 * - `promptMessages` repeats `instructions` and `messages`.
 * - `steps` repeats earlier steps, which the buffer records on their own.
 */
const DUPLICATE_STEP_START_KEYS = new Set(['tools', 'promptMessages', 'steps']);

function isEmptyContainer(value: unknown): boolean {
	if (Array.isArray(value)) return value.length === 0;
	return isRecord(value) && Object.keys(value).length === 0;
}

function captureStepStartPayload(event: GenerateTextStepStartEvent): Record<string, unknown> {
	const hasStepTools = 'stepTools' in event && Array.isArray(event.stepTools);
	const payload: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(event)) {
		if (key === 'tools' && !hasStepTools) {
			payload.tools = summarizeToolSet(value);
			continue;
		}
		if (DUPLICATE_STEP_START_KEYS.has(key) || isEmptyContainer(value)) continue;
		payload[key] = value;
	}
	return sanitizeDebugSnapshotRecord(payload);
}

/**
 * Keeps tool descriptions and plain JSON schemas when the SDK does not report
 * `stepTools`. Zod schemas are dropped: serialized, they are only method stubs.
 */
function summarizeToolSet(tools: unknown): unknown {
	if (!isRecord(tools)) return undefined;
	const summary: Record<string, { description?: string; inputSchema?: unknown }> = {};
	for (const [name, tool] of Object.entries(tools)) {
		if (!isRecord(tool)) continue;
		summary[name] = {
			...(typeof tool.description === 'string' ? { description: tool.description } : {}),
			...(tool.inputSchema !== undefined && !isZodSchema(tool.inputSchema)
				? { inputSchema: tool.inputSchema }
				: {}),
		};
	}
	return summary;
}

/** Matches Zod 3 (`_def`) and Zod 4 (`_zod`) schemas without depending on one Zod copy. */
function isZodSchema(value: unknown): boolean {
	return isRecord(value) && ('_def' in value || '_zod' in value);
}

function captureStepFinishPayload(event: GenerateTextStepEndEvent): Record<string, unknown> {
	return sanitizeDebugSnapshotRecord(event);
}

export function sanitizeStepStart(
	event: GenerateTextStepStartEvent,
	stepNumber: number,
): SanitizedStepStart {
	return {
		...captureStepStartPayload(event),
		stepNumber,
		sdkStepNumber: event.stepNumber,
	};
}

export function sanitizeStepFinish(
	event: GenerateTextStepEndEvent,
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
	onStepStart: (event: GenerateTextStepStartEvent) => void;
	onStepEnd: (event: GenerateTextStepEndEvent) => void;
	/** @deprecated Use `onStepEnd` instead. */
	onStepFinish: (event: GenerateTextStepEndEvent) => void;
} {
	// The agent runtime calls streamText/generateText once per loop iteration. The AI SDK
	// resets stepNumber to 0 on each call, so we allocate a run-scoped sequence instead.
	let stepIndex = buffer.getNextStepIndex(options.runId);

	const onStepEnd = (event: GenerateTextStepEndEvent) => {
		buffer.recordStepFinish(options.runId, stepIndex, event);
		stepIndex++;
	};

	return {
		onStepStart: (event) => {
			buffer.recordStepStart(options.runId, stepIndex, event);
		},
		onStepEnd,
		onStepFinish: onStepEnd,
	};
}

/**
 * Step hooks for one sub-agent turn. The sub-agent keeps its own step sequence,
 * so its steps do not shift the orchestrator's step numbers.
 */
export function createRunDebugSubAgentStepHooks(
	buffer: RunDebugBuffer,
	runId: string,
	options: RunDebugSubAgentOptions,
): RunDebugStepHooks | undefined {
	const subAgentId = buffer.startSubAgent(runId, options);
	if (!subAgentId) return undefined;

	let stepIndex = 0;
	return {
		onStepStart: (event) => {
			buffer.recordSubAgentStepStart(runId, subAgentId, stepIndex, event);
		},
		onStepEnd: (event) => {
			buffer.recordSubAgentStepFinish(runId, subAgentId, stepIndex, event);
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

	private subAgentSequence = 0;

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
			subAgents: [],
			workflowCode: [],
		});
	}

	getNextStepIndex(runId: string): number {
		return this.records.get(runId)?.nextStepIndex ?? 0;
	}

	recordStepStart(runId: string, stepIndex: number, event: GenerateTextStepStartEvent): void {
		const record = this.records.get(runId);
		if (!record) return;
		this.writeStepStart(record, stepIndex, event, runId);
	}

	recordStepFinish(runId: string, stepIndex: number, event: GenerateTextStepEndEvent): void {
		const record = this.records.get(runId);
		if (!record) return;
		this.writeStepFinish(record, stepIndex, event, runId);
	}

	/** Registers a sub-agent turn in the run. Returns its id, or `undefined` when the run is unknown. */
	startSubAgent(runId: string, options: RunDebugSubAgentOptions): string | undefined {
		const record = this.records.get(runId);
		if (!record) return undefined;

		if (record.subAgents.length >= MAX_SUB_AGENTS_PER_RUN) {
			const removed = record.subAgents.shift();
			this.logger?.warn('Evicted oldest sub-agent from run debug buffer', {
				runId,
				subAgentId: removed?.id,
				maxSubAgents: MAX_SUB_AGENTS_PER_RUN,
			});
		}

		this.subAgentSequence++;
		const id = `sub-agent-${this.subAgentSequence}`;
		const lastStep = record.steps.at(-1);
		record.subAgents.push({
			id,
			role: options.role,
			label: options.label ? scrubSecretsInText(options.label.trim()) : undefined,
			parentToolCallId: options.parentToolCallId,
			afterStepNumber: lastStep?.stepNumber,
			startedAt: Date.now(),
			nextStepIndex: 0,
			steps: [],
		});
		return id;
	}

	recordSubAgentStepStart(
		runId: string,
		subAgentId: string,
		stepIndex: number,
		event: GenerateTextStepStartEvent,
	): void {
		const subAgent = this.findSubAgent(runId, subAgentId);
		if (!subAgent) return;
		this.writeStepStart(subAgent, stepIndex, event, runId);
	}

	recordSubAgentStepFinish(
		runId: string,
		subAgentId: string,
		stepIndex: number,
		event: GenerateTextStepEndEvent,
	): void {
		const subAgent = this.findSubAgent(runId, subAgentId);
		if (!subAgent) return;
		this.writeStepFinish(subAgent, stepIndex, event, runId);
	}

	private findSubAgent(runId: string, subAgentId: string): RunDebugSubAgent | undefined {
		return this.records.get(runId)?.subAgents.find((subAgent) => subAgent.id === subAgentId);
	}

	private writeStepStart(
		container: StepContainer,
		stepIndex: number,
		event: GenerateTextStepStartEvent,
		runId: string,
	): void {
		const existing = container.steps.find((step) => step.stepNumber === stepIndex);
		if (existing) {
			existing.input = sanitizeStepStart(event, stepIndex);
			return;
		}

		this.evictOldestStepIfNeeded(container, runId);
		container.steps.push({
			stepNumber: stepIndex,
			input: sanitizeStepStart(event, stepIndex),
		});
		container.steps.sort((a, b) => a.stepNumber - b.stepNumber);
	}

	private writeStepFinish(
		container: StepContainer,
		stepIndex: number,
		event: GenerateTextStepEndEvent,
		runId: string,
	): void {
		const existing = container.steps.find((step) => step.stepNumber === stepIndex);
		if (existing) {
			existing.output = sanitizeStepFinish(event, stepIndex);
			container.nextStepIndex = stepIndex + 1;
			return;
		}

		this.evictOldestStepIfNeeded(container, runId);
		container.steps.push({
			stepNumber: stepIndex,
			output: sanitizeStepFinish(event, stepIndex),
		});
		container.steps.sort((a, b) => a.stepNumber - b.stepNumber);
		container.nextStepIndex = stepIndex + 1;
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

	private evictOldestStepIfNeeded(container: StepContainer, runId: string): void {
		if (container.steps.length < MAX_STEPS_PER_RUN) return;

		const removed = container.steps.shift();
		this.logger?.warn('Evicted oldest step from run debug buffer', {
			runId,
			stepNumber: removed?.stepNumber,
			maxSteps: MAX_STEPS_PER_RUN,
		});
	}
}
