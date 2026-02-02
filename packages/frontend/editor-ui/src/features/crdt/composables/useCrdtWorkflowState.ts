import type { WorkflowState } from '@/app/composables/useWorkflowState';
import type { WorkflowDocument } from '../types/workflowDocument.types';
import type { IUpdateInformation, INodeUpdatePropertiesInformation } from '@/Interface';
import isEqual from 'lodash/isEqual';

/**
 * CRDT-backed implementation of WorkflowState.
 *
 * This composable provides the same interface as useWorkflowState but backed
 * by CRDT operations for real-time collaborative editing.
 *
 * Key difference from the standard implementation:
 * - setNodeParameters does PATH-BASED updates, not full object replacement
 * - This prevents conflicts when multiple users edit different parameters
 */
export function useCrdtWorkflowState(
	doc: WorkflowDocument,
	getNodeIdByName: (name: string) => string | undefined,
): Partial<WorkflowState> {
	/**
	 * Compare old and new params, update only changed paths.
	 * This prevents CRDT conflicts when multiple users edit different params.
	 */
	function setNodeParameters(updateInformation: IUpdateInformation): void {
		const nodeId = getNodeIdByName(updateInformation.name);
		if (!nodeId) return;

		const newParams = updateInformation.value as Record<string, unknown>;
		const currentNode = doc.findNode(nodeId);
		const oldParams = currentNode?.parameters ?? {};

		diffAndUpdate(nodeId, oldParams, newParams, []);
	}

	/**
	 * Recursively diff old and new objects, updating only changed paths.
	 */
	function diffAndUpdate(
		nodeId: string,
		oldObj: Record<string, unknown>,
		newObj: Record<string, unknown>,
		path: string[],
	): void {
		const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

		// Ensure updateNodeParamAtPath is available (CRDT-only feature)
		if (!doc.updateNodeParamAtPath) {
			// Fallback: update entire params object if path-based update not available
			doc.updateNodeParams(nodeId, newObj);
			return;
		}

		for (const key of allKeys) {
			const oldVal = oldObj[key];
			const newVal = newObj[key];
			const currentPath = [...path, key];

			if (newVal === undefined && oldVal !== undefined) {
				doc.updateNodeParamAtPath(nodeId, currentPath, undefined);
			} else if (oldVal === undefined && newVal !== undefined) {
				doc.updateNodeParamAtPath(nodeId, currentPath, newVal);
			} else if (Array.isArray(oldVal) && Array.isArray(newVal)) {
				diffArrays(nodeId, oldVal, newVal, currentPath);
			} else if (isPlainObject(newVal) && isPlainObject(oldVal)) {
				diffAndUpdate(nodeId, oldVal, newVal, currentPath);
			} else if (!isEqual(oldVal, newVal)) {
				doc.updateNodeParamAtPath(nodeId, currentPath, newVal);
			}
		}
	}

	/**
	 * Handle array diffing.
	 * For v1, we replace the entire array if it changed.
	 * Fine-grained array operations can be added later.
	 */
	function diffArrays(nodeId: string, oldArr: unknown[], newArr: unknown[], path: string[]): void {
		// Replace entire array if length changed or content differs
		if (oldArr.length !== newArr.length || !isEqual(oldArr, newArr)) {
			doc.updateNodeParamAtPath?.(nodeId, path, newArr);
		}
	}

	function isPlainObject(val: unknown): val is Record<string, unknown> {
		return typeof val === 'object' && val !== null && !Array.isArray(val);
	}

	function setNodeValue(updateInformation: IUpdateInformation): void {
		const nodeId = getNodeIdByName(updateInformation.name);
		if (!nodeId || !updateInformation.key) return;

		// Use generic setNodeSetting for all top-level node properties
		const settingsKeys = [
			'disabled',
			'alwaysOutputData',
			'executeOnce',
			'retryOnFail',
			'maxTries',
			'waitBetweenTries',
			'onError',
			'notes',
			'notesInFlow',
			'color',
		];

		if (settingsKeys.includes(updateInformation.key)) {
			doc.setNodeSetting?.(nodeId, updateInformation.key, updateInformation.value);
		}
	}

	function updateNodeProperties(updateInformation: INodeUpdatePropertiesInformation): void {
		const nodeId = getNodeIdByName(updateInformation.name);
		if (!nodeId) return;

		for (const [key, value] of Object.entries(updateInformation.properties)) {
			if (key === 'disabled') {
				doc.setNodeDisabled(nodeId, value as boolean);
			}
			// Handle other properties (credentials, etc.)
		}
	}

	// Stub methods that might be called but aren't needed for basic CRDT operation
	function setNodeIssue(): void {
		// Node issues are local UI state, not synced via CRDT
	}

	function resetParametersLastUpdatedAt(): void {
		// This is for tracking dirty state, not needed in CRDT context
	}

	// Return partial WorkflowState - only the methods needed for parameter editing
	return {
		setNodeParameters,
		setNodeValue,
		updateNodeProperties,
		setNodeIssue,
		resetParametersLastUpdatedAt,
	} as Partial<WorkflowState>;
}
