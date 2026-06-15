import type { VectorStore } from '@langchain/core/vectorstores';
import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { DEFAULT_OPERATION_MODES, OPERATION_MODE_DESCRIPTIONS } from './constants';
import type { NodeOperationMode, VectorStoreNodeConstructorArgs } from './types';

/**
 * Transforms field descriptions to show only for specific operation modes
 * This function adds displayOptions to each field to make it appear only for specified modes
 */
export function transformDescriptionForOperationMode(
	fields: INodeProperties[],
	mode: NodeOperationMode | NodeOperationMode[],
): INodeProperties[] {
	return fields.map((field) => ({
		...field,
		displayOptions: { show: { mode: Array.isArray(mode) ? mode : [mode] } },
	}));
}

/**
 * Checks if the update operation is supported for a specific vector store
 * A vector store supports updates if it explicitly includes 'update' in its operationModes
 */
export function isUpdateSupported<T extends VectorStore>(
	args: VectorStoreNodeConstructorArgs<T>,
): boolean {
	return args.meta.operationModes?.includes('update') ?? false;
}

/**
 * Returns the operation mode options enabled for a specific vector store
 * Filters the full list of operation modes based on what's enabled for this vector store
 */
export function getOperationModeOptions<T extends VectorStore>(
	args: VectorStoreNodeConstructorArgs<T>,
): INodePropertyOptions[] {
	const enabledOperationModes = args.meta.operationModes ?? DEFAULT_OPERATION_MODES;

	return OPERATION_MODE_DESCRIPTIONS.filter(({ value }) =>
		enabledOperationModes.includes(value as NodeOperationMode),
	);
}
