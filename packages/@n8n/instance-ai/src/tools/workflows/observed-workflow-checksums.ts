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
const runLocalChecksums = new WeakMap<InstanceAiContext, Map<string, string>>();

function runLocalFor(context: InstanceAiContext): Map<string, string> {
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
 * save. `undefined` clears the entry: with no checksum to pin to, an unguarded
 * save beats one guarded against a stale expectation.
 */
export async function rememberObservedWorkflowChecksum(
	context: InstanceAiContext,
	workflowId: string,
	checksum: string | undefined,
): Promise<void> {
	const runLocal = runLocalFor(context);
	if (checksum === undefined) {
		runLocal.delete(workflowId);
	} else {
		runLocal.set(workflowId, checksum);
	}

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
	const threadChecksums = await readThreadChecksums(context);
	// Falling back to this run's copy only matters when the thread write failed:
	// a cleared entry is dropped from both at once, and a later run starts with
	// an empty run-local map.
	return threadChecksums?.[workflowId] ?? runLocalFor(context).get(workflowId);
}
