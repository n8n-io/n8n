import type { Connection, ValidConnectionFunc } from '@vue-flow/core';
import type { WorkflowDocument, ComputedHandle } from '../types/workflowDocument.types';

/** Common edge interface for both Vue Flow and Workflow edges */
interface EdgeLike {
	source: string;
	target: string;
	sourceHandle?: string | null;
	targetHandle?: string | null;
}

/**
 * Parse a handle string into its components.
 * Handle format: "{mode}/{type}/{index}" e.g., "outputs/main/0"
 */
export function parseHandle(handle: string | null | undefined): {
	mode: 'inputs' | 'outputs';
	type: string;
	index: number;
} {
	const parts = (handle ?? '').split('/');
	const mode = parts[0] === 'inputs' ? 'inputs' : 'outputs';
	const type = parts[1] ?? 'main';
	const index = parseInt(parts[2] ?? '0', 10);
	return { mode, type, index: isNaN(index) ? 0 : index };
}

/**
 * Count existing connections for a specific handle.
 */
export function countConnectionsForHandle(
	edges: EdgeLike[],
	nodeId: string,
	handleString: string,
): number {
	const { mode } = parseHandle(handleString);

	if (mode === 'outputs') {
		// Count edges where this node is the source with this handle
		return edges.filter((edge) => edge.source === nodeId && edge.sourceHandle === handleString)
			.length;
	} else {
		// Count edges where this node is the target with this handle
		return edges.filter((edge) => edge.target === nodeId && edge.targetHandle === handleString)
			.length;
	}
}

/**
 * Find handle metadata from computed handles.
 */
function findHandleMetadata(
	handles: ComputedHandle[] | undefined,
	handleString: string,
): ComputedHandle | undefined {
	if (!handles) return undefined;
	return handles.find((h) => h.handleId === handleString);
}

export interface ConnectionValidationResult {
	valid: boolean;
	reason?: string;
}

export interface UseConnectionValidationOptions {
	doc: WorkflowDocument;
}

/**
 * Connection validation composable for CRDT workflow documents.
 *
 * Validates connections before they are created:
 * - Prevents input-to-input connections
 * - Prevents output-to-output connections
 * - Requires matching connection types (main→main, ai_tool→ai_tool)
 * - Enforces maxConnections limits on handles
 * - Prevents self-connections (node connecting to itself)
 *
 * Note: Duplicate connection detection is handled by Vue Flow internally
 * via `connectionExists()` in `addEdgeToStore()`.
 *
 * @example
 * ```ts
 * const { isValidConnection } = useConnectionValidation({ doc });
 *
 * // Use with Vue Flow
 * <VueFlow :is-valid-connection="isValidConnection" />
 * ```
 */
export function useConnectionValidation(options: UseConnectionValidationOptions) {
	const { doc } = options;

	/**
	 * Validate a connection with detailed reason.
	 * Uses edges provided by Vue Flow's ValidConnectionFunc callback.
	 */
	function validateConnection(
		connection: Connection,
		edges: EdgeLike[],
	): ConnectionValidationResult {
		const { source, target, sourceHandle, targetHandle } = connection;

		// 1. Prevent self-connections
		if (source === target) {
			return { valid: false, reason: 'Cannot connect a node to itself' };
		}

		// 2. Parse handles
		const sourceParsed = parseHandle(sourceHandle);
		const targetParsed = parseHandle(targetHandle);

		// 3. Check mode compatibility (outputs must connect to inputs)
		if (sourceParsed.mode === targetParsed.mode) {
			const modeText = sourceParsed.mode === 'inputs' ? 'inputs' : 'outputs';
			return { valid: false, reason: `Cannot connect ${modeText} to ${modeText}` };
		}

		// 4. Check type compatibility (main must connect to main, etc.)
		if (sourceParsed.type !== targetParsed.type) {
			return {
				valid: false,
				reason: `Incompatible types: ${sourceParsed.type} cannot connect to ${targetParsed.type}`,
			};
		}

		// 5. Check maxConnections limits using edges from Vue Flow
		const sourceNode = doc.findNode(source);
		const targetNode = doc.findNode(target);

		if (!sourceNode || !targetNode) {
			return { valid: false, reason: 'Source or target node not found' };
		}

		// Check source handle maxConnections (outputs)
		if (sourceHandle) {
			const sourceHandleMeta = findHandleMetadata(sourceNode.outputs, sourceHandle);
			if (sourceHandleMeta?.maxConnections !== undefined) {
				const currentCount = countConnectionsForHandle(edges, source, sourceHandle);
				if (currentCount >= sourceHandleMeta.maxConnections) {
					return {
						valid: false,
						reason: `Maximum connections (${sourceHandleMeta.maxConnections}) reached for output`,
					};
				}
			}
		}

		// Check target handle maxConnections (inputs)
		if (targetHandle) {
			const targetHandleMeta = findHandleMetadata(targetNode.inputs, targetHandle);
			if (targetHandleMeta?.maxConnections !== undefined) {
				const currentCount = countConnectionsForHandle(edges, target, targetHandle);
				if (currentCount >= targetHandleMeta.maxConnections) {
					return {
						valid: false,
						reason: `Maximum connections (${targetHandleMeta.maxConnections}) reached for input`,
					};
				}
			}
		}

		// Note: Duplicate detection is handled by Vue Flow's connectionExists()
		// in addEdgeToStore(), so we don't need to check here.

		return { valid: true };
	}

	/**
	 * Validator for Vue Flow's isValidConnection prop.
	 * Matches ValidConnectionFunc signature: (connection, { edges, nodes, sourceNode, targetNode }) => boolean
	 */
	const isValidConnection: ValidConnectionFunc = (connection, { edges }) => {
		return validateConnection(connection, edges).valid;
	};

	return {
		validateConnection,
		isValidConnection,
		parseHandle,
		countConnectionsForHandle,
	};
}
