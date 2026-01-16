import type { Connection } from '@vue-flow/core';
import type {
	WorkflowDocument,
	WorkflowEdge,
	ComputedHandle,
} from '../types/workflowDocument.types';

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
	edges: WorkflowEdge[],
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
 * @example
 * ```ts
 * const { isValidConnection, validateConnection } = useConnectionValidation({ doc });
 *
 * // Use with Vue Flow
 * <VueFlow :is-valid-connection="isValidConnection" />
 *
 * // Or check programmatically
 * const result = validateConnection(connection);
 * if (!result.valid) {
 *   console.log('Invalid:', result.reason);
 * }
 * ```
 */
export function useConnectionValidation(options: UseConnectionValidationOptions) {
	const { doc } = options;

	/**
	 * Validate a connection with detailed reason.
	 */
	function validateConnection(connection: Connection): ConnectionValidationResult {
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

		// 5. Check maxConnections limits
		const sourceNode = doc.findNode(source);
		const targetNode = doc.findNode(target);

		if (!sourceNode || !targetNode) {
			return { valid: false, reason: 'Source or target node not found' };
		}

		// Check source handle maxConnections (outputs)
		if (sourceHandle) {
			const sourceHandleMeta = findHandleMetadata(sourceNode.outputs, sourceHandle);
			if (sourceHandleMeta?.maxConnections !== undefined) {
				const currentCount = countConnectionsForHandle(doc.getEdges(), source, sourceHandle);
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
				const currentCount = countConnectionsForHandle(doc.getEdges(), target, targetHandle);
				if (currentCount >= targetHandleMeta.maxConnections) {
					return {
						valid: false,
						reason: `Maximum connections (${targetHandleMeta.maxConnections}) reached for input`,
					};
				}
			}
		}

		// 6. Check for duplicate connections
		const edges = doc.getEdges();
		const duplicate = edges.some(
			(edge) =>
				edge.source === source &&
				edge.target === target &&
				edge.sourceHandle === sourceHandle &&
				edge.targetHandle === targetHandle,
		);
		if (duplicate) {
			return { valid: false, reason: 'Connection already exists' };
		}

		return { valid: true };
	}

	/**
	 * Simple boolean validator for Vue Flow's isValidConnection prop.
	 */
	function isValidConnection(connection: Connection): boolean {
		return validateConnection(connection).valid;
	}

	return {
		validateConnection,
		isValidConnection,
		parseHandle,
		countConnectionsForHandle: (nodeId: string, handleString: string) =>
			countConnectionsForHandle(doc.getEdges(), nodeId, handleString),
	};
}
