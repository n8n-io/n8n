import { createHash } from 'crypto';
import type { INode } from 'n8n-workflow';

/**
 * Fields on INode that affect execution output.
 * Cosmetic fields (position, notes, name, id, etc.) are intentionally excluded
 * because changing them does not change node behavior or output.
 */
function getExecutionRelevantConfig(node: INode): Record<string, unknown> {
	return {
		type: node.type,
		typeVersion: node.typeVersion,
		parameters: node.parameters,
		credentials: node.credentials,
		disabled: node.disabled,
		executeOnce: node.executeOnce,
		retryOnFail: node.retryOnFail,
		maxTries: node.maxTries,
		waitBetweenTries: node.waitBetweenTries,
		alwaysOutputData: node.alwaysOutputData,
		onError: node.onError,
		continueOnFail: node.continueOnFail,
	};
}

/**
 * Recursively sorts object keys so JSON.stringify produces a deterministic
 * string regardless of property insertion order.
 */
function sortKeysDeep(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortKeysDeep);
	}

	if (value !== null && typeof value === 'object') {
		const sorted: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
		for (const key of Object.keys(value as Record<string, unknown>).sort()) {
			sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
		}
		return sorted;
	}

	return value;
}

/**
 * Computes a deterministic SHA-256 hash of the execution-relevant configuration
 * of a node. Two nodes with identical execution-relevant fields will always
 * produce the same hash, regardless of field insertion order.
 *
 * Used by `isDirty` to detect whether a node's properties/options have changed
 * since its last execution.
 */
export function computeNodeConfigHash(node: INode): string {
	const config = getExecutionRelevantConfig(node);
	const sorted = sortKeysDeep(config);
	const serialized = JSON.stringify(sorted);
	return createHash('sha256').update(serialized).digest('hex');
}
