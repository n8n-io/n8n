import { formatBytes } from '@n8n/utils/number/bytes';
import type { IWorkflowBase } from 'n8n-workflow';
import { WorkflowOperationError } from 'n8n-workflow';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

import { MEMORY_DOCS_URL } from './memory-guard.constants';
import type { MemoryUsage } from './memory-usage';
import type { RunDataEstimate } from './run-data-tracker';

export function buildStopError(
	workflow: IWorkflowBase,
	estimate: RunDataEstimate | undefined,
	usage: MemoryUsage,
) {
	// Self-healing can hide the description, so the message names the nodes.
	const sentences = ['Execution stopped because the instance was running out of memory.'];
	const runningNode = estimate?.runningNode;
	if (runningNode) sentences.push(`Running node: "${runningNode}".`);
	const largest = largestNode(estimate);
	if (largest) {
		sentences.push(
			`Node holding the most data: "${largest.name}" (about ${formatBytes(largest.bytes)}).`,
		);
	}

	const description = [
		`Memory was at ${formatBytes(usage.usedBytes)} of ${formatBytes(usage.limitBytes)}.`,
		'To keep the instance and its other executions running, n8n stopped the execution that held the most data.',
		'This execution is the likely cause, but not a certain one.',
		`To use less memory, process data in smaller batches. See ${MEMORY_DOCS_URL}`,
	].join(' ');

	const node = workflow.nodes.find((n) => n.name === runningNode);
	return new WorkflowOperationError(sentences.join(' '), node, description);
}

function largestNode(estimate: RunDataEstimate | undefined) {
	let largest: { name: string; bytes: number } | undefined;
	for (const [name, bytes] of estimate?.bytesByNode ?? []) {
		if (!largest || bytes > largest.bytes) largest = { name, bytes };
	}
	return largest;
}

export async function settleWithin(promises: Array<Promise<void>>, timeoutMs: number) {
	let timeout: NodeJS.Timeout | undefined;
	await Promise.race([
		Promise.allSettled(promises),
		new Promise<void>((resolve) => {
			timeout = setTimeout(resolve, timeoutMs);
		}),
	]);
	clearTimeout(timeout);
}

type GarbageCollect = (options: {
	type: 'major';
	execution: 'sync';
	flavor: 'last-resort';
}) => void;

function isGarbageCollect(value: unknown): value is GarbageCollect {
	return typeof value === 'function';
}

/**
 * A regular collection frees the heap but leaves RSS high for many seconds, so a stop
 * would not show in the next sample. The last-resort flavor returns the pages at once.
 */
export function exposeGc(): (() => void) | undefined {
	try {
		setFlagsFromString('--expose-gc');
		const gc: unknown = runInNewContext('gc');
		if (!isGarbageCollect(gc)) return undefined;
		return () => gc({ type: 'major', execution: 'sync', flavor: 'last-resort' });
	} catch {
		return undefined;
	} finally {
		setFlagsFromString('--no-expose-gc');
	}
}
