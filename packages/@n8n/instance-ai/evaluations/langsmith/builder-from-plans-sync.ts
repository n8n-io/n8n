// ---------------------------------------------------------------------------
// LangSmith dataset sync — builder evals seeded from orchestrator plans.
//
// Reads each example from a parent dataset (default
// `notion-pairwise-workflows`), drives the orchestrator with the parent
// prompt to capture the reconciled `PlannedTask[]`, and writes one row
// per `build-workflow` task to a target dataset
// (default `instance-ai-builder-from-plans`).
//
// The target dataset is shaped so the existing pairwise CLI (`pairwise.ts`)
// consumes it unchanged:
//   inputs.prompt          = task.spec  (fed straight into buildInProcess)
//   inputs.evals.dos       = parent dos (inherited verbatim)
//   inputs.evals.donts     = parent donts (inherited verbatim)
// Metadata carries the originating blueprint, parent provenance, and other
// debug context.
//
// Idempotence: rows are keyed by `${parentExampleId}/${slug(workflowName)}`
// rather than the blueprint task id. The planner re-generates fresh task
// ids each run, but the workflow *name* tracks the request semantics and
// stays stable across runs of the same prompt. The derivedId lives in
// metadata so re-syncs can match existing rows.
// ---------------------------------------------------------------------------

import type { PlannedTaskArg } from '@n8n/api-types';
import { randomUUID } from 'crypto';
import type { Client } from 'langsmith';
import type { Example, KVMap } from 'langsmith/schemas';
import { z } from 'zod';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { capturePlanFromPrompt, PlanCaptureFailedError } from '../harness/plan-capture';

/**
 * Eval-only suffix appended to every captured prompt. Mirrors the suffix
 * `pairwise.ts` uses on the builder side — the planner sub-agent must not
 * call `ask-user` here (no human in the loop), or the orchestrator stalls
 * before it can reach `submit-plan` and we capture nothing.
 */
const EVAL_PROMPT_SUFFIX =
	'\n\n---\n' +
	'You are running inside an automated, non-interactive evaluation. ' +
	'There is no human to answer follow-up questions. ' +
	'Do not call `ask-user` and do not ask for clarification — pick reasonable defaults and proceed straight to plan submission.';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Inputs the existing pairwise CLI consumes — same shape as the Notion dataset. */
export const builderFromPlansInputsSchema = z.object({
	prompt: z.string(),
	evals: z.object({
		dos: z.string().optional(),
		donts: z.string().optional(),
	}),
});
export type BuilderFromPlansInputs = z.infer<typeof builderFromPlansInputsSchema>;

const blueprintWorkflowItemMetaSchema = z.object({
	id: z.string(),
	name: z.string(),
	purpose: z.string(),
	integrations: z.array(z.string()),
	triggerDescription: z.string().optional(),
	existingWorkflowId: z.string().optional(),
	dependsOn: z.array(z.string()),
});

export const builderFromPlansMetadataSchema = z.object({
	parentDataset: z.string(),
	parentExampleId: z.string(),
	parentPrompt: z.string(),
	derivedId: z.string(),
	workflowName: z.string(),
	taskId: z.string(),
	taskTitle: z.string(),
	taskKind: z.literal('build-workflow'),
	taskDeps: z.array(z.string()),
	taskWorkflowId: z.string().optional(),
	blueprint: z.object({
		summary: z.string().optional(),
		assumptions: z.array(z.string()).default([]),
		workflowItem: blueprintWorkflowItemMetaSchema.optional(),
		siblingTasks: z.array(
			z.object({
				id: z.string(),
				kind: z.string(),
				title: z.string(),
			}),
		),
	}),
	capturedAt: z.string(),
});
export type BuilderFromPlansMetadata = z.infer<typeof builderFromPlansMetadataSchema>;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SyncBuilderFromPlansOptions {
	lsClient: Client;
	n8nClient: N8nClient;
	parentDataset: string;
	targetDataset: string;
	logger: EvalLogger;
	timeoutMs: number;
	concurrency: number;
	maxExamples?: number;
	exampleIds?: Set<string>;
}

export interface SyncBuilderFromPlansResult {
	created: number;
	updated: number;
	unchanged: number;
	skipped: Array<{ parentExampleId: string; reason: string }>;
}

/**
 * Capture plans from `parentDataset` and sync derived rows to `targetDataset`.
 *
 * - Creates the target dataset if it doesn't exist.
 * - Iterates parent examples (concurrency-limited), captures each plan.
 * - Flattens to one row per `build-workflow` task.
 * - Diffs against existing rows by derived id `${parentExampleId}/${taskId}`.
 * - Creates new rows, updates rows whose inputs/metadata changed, leaves the rest.
 *
 * Never deletes rows. If a parent example produced fewer build-workflow tasks
 * than before, the now-orphaned rows stay in the dataset (manual cleanup
 * via the LangSmith UI). This mirrors `dataset-sync.ts` behaviour.
 */
export async function syncBuilderFromPlansDataset(
	opts: SyncBuilderFromPlansOptions,
): Promise<SyncBuilderFromPlansResult> {
	const datasetId = await ensureDataset(opts.lsClient, opts.targetDataset, opts.logger);

	const existingByDerivedId = new Map<string, Example>();
	for await (const example of opts.lsClient.listExamples({ datasetId })) {
		const derivedId = readDerivedId(example);
		if (derivedId) existingByDerivedId.set(derivedId, example);
	}

	// Capture phase.
	const captures = await captureAll(opts);

	// Flatten + diff phase.
	const toCreate: RowUpsert[] = [];
	const toUpdate: RowUpsert[] = [];
	let unchanged = 0;

	for (const item of captures.captured) {
		for (const task of item.captured.plannedTasks) {
			if (task.kind !== 'build-workflow') continue;

			const workflowName = resolveWorkflowName(item, task);
			const derivedId = `${item.captured.parentExampleId}/${slugify(workflowName)}`;
			const inputs = buildInputs(task, item.parentEvals);
			const metadata = buildMetadata(item, task, derivedId, workflowName);

			const existing = existingByDerivedId.get(derivedId);
			if (!existing) {
				toCreate.push({ id: randomUUID(), derivedId, inputs, metadata });
			} else if (
				inputsChanged(existing.inputs, inputs) ||
				metadataChanged(existing.metadata, metadata)
			) {
				toUpdate.push({ id: existing.id, derivedId, inputs, metadata });
			} else {
				unchanged++;
			}
		}

		// A capture with zero build-workflow tasks is a skip, not a create.
		if (!item.captured.plannedTasks.some((t) => t.kind === 'build-workflow')) {
			captures.skipped.push({
				parentExampleId: item.captured.parentExampleId,
				reason: 'no-build-workflow-tasks',
			});
		}
	}

	if (toCreate.length > 0) {
		await opts.lsClient.createExamples(
			toCreate.map((r) => ({
				id: r.id,
				inputs: r.inputs,
				metadata: r.metadata,
				dataset_id: datasetId,
			})),
		);
		opts.logger.info(`  Created ${String(toCreate.length)} example(s)`);
	}

	if (toUpdate.length > 0) {
		await opts.lsClient.updateExamples(
			toUpdate.map((r) => ({
				id: r.id,
				inputs: r.inputs,
				metadata: r.metadata,
				dataset_id: datasetId,
			})),
		);
		opts.logger.info(`  Updated ${String(toUpdate.length)} example(s)`);
	}

	if (toCreate.length === 0 && toUpdate.length === 0) {
		opts.logger.info('  Dataset up to date');
	}

	if (captures.skipped.length > 0) {
		opts.logger.info(
			`  Skipped ${String(captures.skipped.length)} parent example(s): ${captures.skipped
				.map((s) => `${s.parentExampleId}(${s.reason})`)
				.join(', ')}`,
		);
	}

	return {
		created: toCreate.length,
		updated: toUpdate.length,
		unchanged,
		skipped: captures.skipped,
	};
}

// ---------------------------------------------------------------------------
// Capture phase
// ---------------------------------------------------------------------------

interface CapturedItem {
	captured: Awaited<ReturnType<typeof capturePlanFromPrompt>>;
	parentPrompt: string;
	parentEvals: { dos?: string; donts?: string };
}

interface CaptureBatch {
	captured: CapturedItem[];
	skipped: Array<{ parentExampleId: string; reason: string }>;
}

async function captureAll(opts: SyncBuilderFromPlansOptions): Promise<CaptureBatch> {
	const parents: Array<{ id: string; prompt: string; evals: { dos?: string; donts?: string } }> =
		[];
	for await (const raw of opts.lsClient.listExamples({ datasetName: opts.parentDataset })) {
		if (opts.exampleIds && !opts.exampleIds.has(raw.id)) continue;
		const parsed = parseParentExample(raw);
		if (!parsed) continue;
		parents.push(parsed);
		if (opts.maxExamples && parents.length >= opts.maxExamples) break;
	}

	opts.logger.info(`Capturing plans from ${String(parents.length)} parent example(s)`);

	const captured: CapturedItem[] = [];
	const skipped: Array<{ parentExampleId: string; reason: string }> = [];

	let cursor = 0;
	const workers = Array.from({ length: Math.min(opts.concurrency, parents.length) }, async () => {
		while (cursor < parents.length) {
			const idx = cursor++;
			const parent = parents[idx];
			try {
				const plan = await capturePlanFromPrompt({
					client: opts.n8nClient,
					parentExampleId: parent.id,
					prompt: parent.prompt + EVAL_PROMPT_SUFFIX,
					timeoutMs: opts.timeoutMs,
					logger: opts.logger,
				});
				captured.push({ captured: plan, parentPrompt: parent.prompt, parentEvals: parent.evals });
				opts.logger.verbose(
					`  [${parent.id}] captured ${String(plan.plannedTasks.length)} task(s)`,
				);
			} catch (error) {
				const reason =
					error instanceof PlanCaptureFailedError
						? error.reason
						: error instanceof Error
							? `error: ${error.message}`
							: 'error: unknown';
				skipped.push({ parentExampleId: parent.id, reason });
				opts.logger.warn(`  [${parent.id}] capture failed: ${reason}`);
			}
		}
	});

	await Promise.all(workers);

	return { captured, skipped };
}

function parseParentExample(
	raw: Example,
): { id: string; prompt: string; evals: { dos?: string; donts?: string } } | undefined {
	const inputs = isRecord(raw.inputs) ? raw.inputs : {};
	const prompt = typeof inputs.prompt === 'string' ? inputs.prompt : '';
	if (!prompt) return undefined;

	let criteria: Record<string, unknown> = {};
	if (isRecord(inputs.evals)) criteria = inputs.evals;
	else if (isRecord(inputs.context)) criteria = inputs.context;

	return {
		id: raw.id,
		prompt,
		evals: {
			dos: typeof criteria.dos === 'string' ? criteria.dos : undefined,
			donts: typeof criteria.donts === 'string' ? criteria.donts : undefined,
		},
	};
}

// ---------------------------------------------------------------------------
// Row construction
// ---------------------------------------------------------------------------

interface RowUpsert {
	id: string;
	derivedId: string;
	inputs: BuilderFromPlansInputs;
	metadata: BuilderFromPlansMetadata;
}

function buildInputs(
	task: PlannedTaskArg,
	parentEvals: { dos?: string; donts?: string },
): BuilderFromPlansInputs {
	return {
		prompt: task.spec,
		evals: {
			dos: parentEvals.dos,
			donts: parentEvals.donts,
		},
	};
}

function buildMetadata(
	item: CapturedItem,
	task: PlannedTaskArg,
	derivedId: string,
	workflowName: string,
): BuilderFromPlansMetadata {
	const blueprintItem = item.captured.blueprint.workflows.find((w) => w.id === task.id);
	return {
		parentDataset: 'notion-pairwise-workflows',
		parentExampleId: item.captured.parentExampleId,
		parentPrompt: item.parentPrompt,
		derivedId,
		workflowName,
		taskId: task.id,
		taskTitle: task.title,
		taskKind: 'build-workflow',
		taskDeps: task.deps,
		taskWorkflowId: task.workflowId,
		blueprint: {
			summary: item.captured.blueprint.summary || undefined,
			assumptions: item.captured.blueprint.assumptions,
			workflowItem: blueprintItem,
			siblingTasks: item.captured.plannedTasks
				.filter((t) => t.id !== task.id)
				.map((t) => ({ id: t.id, kind: t.kind, title: t.title })),
		},
		capturedAt: new Date().toISOString(),
	};
}

// ---------------------------------------------------------------------------
// Dataset / diff helpers
// ---------------------------------------------------------------------------

async function ensureDataset(
	lsClient: Client,
	datasetName: string,
	logger: EvalLogger,
): Promise<string> {
	if (await lsClient.hasDataset({ datasetName })) {
		const dataset = await lsClient.readDataset({ datasetName });
		return dataset.id;
	}
	const dataset = await lsClient.createDataset(datasetName, {
		description:
			'Builder evals seeded from orchestrator plans — one row per build-workflow planned task.',
	});
	logger.info(`Created dataset: ${datasetName}`);
	return dataset.id;
}

function readDerivedId(example: Example): string | undefined {
	const md = isRecord(example.metadata) ? example.metadata : undefined;
	if (!md) return undefined;
	const direct = typeof md.derivedId === 'string' ? md.derivedId : undefined;
	if (direct) return direct;
	// Fallback for rows written by an earlier version of this sync that
	// keyed on the (unstable) blueprint task id. Treated as legacy — they'll
	// be effectively ignored on re-sync, leaving the new name-based row to
	// be created alongside.
	return undefined;
}

/**
 * Workflow name is the stable identity across orchestrator runs — the
 * planner re-generates task ids each run, but the workflow name reflects
 * the user request. Prefer the rich blueprint item; fall back to parsing
 * the task title (`Build 'Foo' workflow`).
 */
function resolveWorkflowName(item: CapturedItem, task: PlannedTaskArg): string {
	const fromBlueprint = item.captured.blueprint.workflows.find((w) => w.id === task.id);
	if (fromBlueprint?.name) return fromBlueprint.name;
	const match = /^Build '([^']+)' workflow$/.exec(task.title);
	if (match) return match[1];
	return task.title;
}

function slugify(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
}

function inputsChanged(existing: KVMap | undefined, incoming: BuilderFromPlansInputs): boolean {
	const parsed = builderFromPlansInputsSchema.safeParse(existing ?? {});
	if (!parsed.success) return true;
	const e = parsed.data;
	return (
		e.prompt !== incoming.prompt ||
		e.evals.dos !== incoming.evals.dos ||
		e.evals.donts !== incoming.evals.donts
	);
}

/**
 * Compare a *stable subset* of metadata. Fields that the planner re-rolls
 * every run (`taskId`, `taskDeps`, `siblingTasks`, `capturedAt`) are
 * excluded — otherwise every re-sync would look like a content change.
 */
function metadataChanged(existing: KVMap | undefined, incoming: BuilderFromPlansMetadata): boolean {
	const parsed = builderFromPlansMetadataSchema.safeParse(existing ?? {});
	if (!parsed.success) return true;
	return JSON.stringify(stableSubset(parsed.data)) !== JSON.stringify(stableSubset(incoming));
}

function stableSubset(md: BuilderFromPlansMetadata): Record<string, unknown> {
	return {
		parentDataset: md.parentDataset,
		parentExampleId: md.parentExampleId,
		parentPrompt: md.parentPrompt,
		derivedId: md.derivedId,
		workflowName: md.workflowName,
		taskTitle: md.taskTitle,
		taskKind: md.taskKind,
		taskWorkflowId: md.taskWorkflowId,
		blueprint: {
			summary: md.blueprint.summary,
			assumptions: md.blueprint.assumptions,
			workflowItem: md.blueprint.workflowItem,
		},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
