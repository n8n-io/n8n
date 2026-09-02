import { z } from 'zod';

import { getThread, patchThread } from '../../storage/thread-patch';
import type { InstanceAiContext } from '../../types';

const METADATA_KEY = 'instanceAiObservedWorkflowChecksums';

const observedChecksumsSchema = z.record(z.string(), z.string());

/**
 * Checksum of the workflow state this conversation last observed, per workflow.
 *
 * `build-workflow` gets its optimistic-concurrency expectation from the source
 * file binding, but the plain `workflows(action="update")` path has no source
 * file to bind to. Without an expectation the agent overwrites whatever landed
 * in the meantime — a canvas autosave, another user's edit, another thread.
 *
 * Persisted on the thread, because every run builds a fresh context: a workflow
 * read in one turn is often only saved in a later one.
 */
/** `null` is a tombstone: observed in this run as having no checksum to pin to. */
const runLocalChecksums = new WeakMap<InstanceAiContext, Map<string, string | null>>();

function runLocalFor(context: InstanceAiContext): Map<string, string | null> {
	let checksums = runLocalChecksums.get(context);
	if (!checksums) {
		checksums = new Map();
		runLocalChecksums.set(context, checksums);
	}

	return checksums;
}

function parseChecksums(raw: unknown): Record<string, string> {
	const parsed = observedChecksumsSchema.safeParse(raw);
	return parsed.success ? parsed.data : {};
}

async function readThreadChecksums(
	context: InstanceAiContext,
): Promise<Record<string, string> | undefined> {
	if (!context.threadMemory || !context.threadId) return undefined;

	try {
		const thread = await getThread(context.threadMemory, context.threadId);
		return parseChecksums(thread?.metadata?.[METADATA_KEY]);
	} catch (error) {
		context.logger?.debug('Failed to read observed workflow checksums from thread metadata', {
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}

/**
 * Records the workflow state this conversation has seen — a read or its own
 * save. `undefined` clears the entry, and is remembered as a tombstone for the
 * rest of the run: with no checksum to pin to, an unguarded save beats one
 * guarded against an expectation we already know is stale.
 */
export async function rememberObservedWorkflowChecksum(
	context: InstanceAiContext,
	workflowId: string,
	checksum: string | undefined,
): Promise<void> {
	runLocalFor(context).set(workflowId, checksum ?? null);

	if (!context.threadMemory || !context.threadId) return;

	try {
		await patchThread(context.threadMemory, {
			threadId: context.threadId,
			update: ({ metadata = {} }) => {
				const checksums = parseChecksums(metadata[METADATA_KEY]);
				if (checksum === undefined) {
					delete checksums[workflowId];
				} else {
					checksums[workflowId] = checksum;
				}
				return { metadata: { ...metadata, [METADATA_KEY]: checksums } };
			},
		});
	} catch (error) {
		// The run-local copy still guards saves made in this run.
		context.logger?.warn('Failed to persist the observed workflow checksum to thread metadata', {
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Records the workflow's current state for reads that hand the agent a graph to
 * edit but no checksum of their own (`get-json`). Best-effort: bookkeeping must
 * never fail the read it is attached to.
 */
export async function rememberCurrentWorkflowChecksum(
	context: InstanceAiContext,
	workflowId: string,
): Promise<void> {
	try {
		const detail = await context.workflowService.get(workflowId);
		await rememberObservedWorkflowChecksum(context, workflowId, detail.checksum);
	} catch (error) {
		context.logger?.debug('Failed to record the observed workflow checksum', {
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function getObservedWorkflowChecksum(
	context: InstanceAiContext,
	workflowId: string,
): Promise<string | undefined> {
	// What this run observed wins: it is at least as fresh as the thread copy, and
	// strictly fresher when the thread write failed. A later run starts with an
	// empty run-local map and falls through to the thread.
	const runLocal = runLocalFor(context);
	if (runLocal.has(workflowId)) return runLocal.get(workflowId) ?? undefined;

	const threadChecksums = await readThreadChecksums(context);
	return threadChecksums?.[workflowId];
}
