import type {
	INodeExecutionData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { BINARY_MODE_COMBINED, isBinaryValue } from 'n8n-workflow';

function collectFromValue(value: unknown, ids: Set<string>, seen: WeakSet<object>) {
	const stack: unknown[] = [value];
	while (stack.length > 0) {
		const current = stack.pop();
		if (
			typeof current !== 'object' ||
			current === null ||
			Buffer.isBuffer(current) ||
			seen.has(current)
		)
			continue;

		seen.add(current);
		if (isBinaryValue(current) && typeof current.id === 'string' && current.id) {
			ids.add(current.id);
		}

		const children = Object.values(current);
		for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]);
	}
}

/** Collect stored binary IDs from workflow items. */
export function collectBinaryDataIds(items: INodeExecutionData[], includeJson = false): string[] {
	const ids = new Set<string>();
	const seen = new WeakSet<object>();
	for (const item of items) {
		for (const binaryData of Object.values(item.binary ?? {})) {
			if (binaryData.id) ids.add(binaryData.id);
		}
		if (includeJson) collectFromValue(item.json, ids, seen);
	}
	return [...ids];
}

/** Collect stored binary IDs from workflow items and keep the ones that `canRead` accepts. */
export async function filterBinaryDataIds(
	items: INodeExecutionData[],
	includeJson: boolean,
	canRead: (binaryDataId: string) => Promise<boolean>,
): Promise<string[]> {
	const readableIds: string[] = [];
	for (const binaryDataId of collectBinaryDataIds(items, includeJson)) {
		if (await canRead(binaryDataId)) readableIds.push(binaryDataId);
	}
	return readableIds;
}

/**
 * Collect the stored binary IDs in the items that the workflow may read.
 * Checks IDs in JSON in combined binary mode. Returns no IDs without access control.
 */
export async function collectAllowedBinaryDataIds(
	items: INodeExecutionData[],
	binaryDataAccess: IWorkflowExecuteAdditionalData['binaryDataAccess'],
	workflow: Pick<IWorkflowBase, 'id' | 'settings'>,
	grantedIds?: string[],
): Promise<string[]> {
	if (!binaryDataAccess) return [];
	return await filterBinaryDataIds(
		items,
		workflow.settings?.binaryMode === BINARY_MODE_COMBINED,
		async (id) => await binaryDataAccess.isAllowed(id, workflow.id, grantedIds),
	);
}
