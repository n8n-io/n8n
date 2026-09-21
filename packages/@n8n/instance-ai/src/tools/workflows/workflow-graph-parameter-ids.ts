import { isRecord } from '@n8n/utils/is-record';
import { generateDeterministicNodeId } from '@n8n/workflow-sdk';
import { isINodeProperties, isINodePropertyCollection, type INodeProperties } from 'n8n-workflow';

/** Fill UI row IDs only where the installed schema declares a row collection. */
export function addWorkflowGraphParameterIds(
	nodeId: string,
	parameters: Record<string, unknown>,
	properties: INodeProperties[],
	path: Array<string | number> = [],
): Record<string, unknown> {
	const result = { ...parameters };
	for (const property of properties) {
		// A name can have different types in different modes. Leave ambiguous definitions alone.
		if (properties.some(({ name, type }) => name === property.name && type !== property.type))
			continue;
		const value = result[property.name];
		const propertyPath = [...path, property.name];
		if (property.type === 'assignmentCollection' || property.type === 'filter') {
			if (!isRecord(value)) continue;
			const key = property.type === 'filter' ? 'conditions' : 'assignments';
			const rows = value[key];
			if (!Array.isArray(rows)) continue;
			result[property.name] = {
				...value,
				[key]: rows.map((row: unknown, index) =>
					isRecord(row) && row.id === undefined
						? {
								...row,
								id: generateDeterministicNodeId(
									nodeId,
									'parameter-row',
									JSON.stringify([...propertyPath, key, index]),
								),
							}
						: row,
				),
			};
		} else if (property.type === 'collection') {
			const children = property.options?.filter(isINodeProperties) ?? [];
			if (Array.isArray(value)) {
				result[property.name] = value.map((entry: unknown, index) =>
					isRecord(entry)
						? addWorkflowGraphParameterIds(nodeId, entry, children, [...propertyPath, index])
						: entry,
				);
			} else if (isRecord(value)) {
				result[property.name] = addWorkflowGraphParameterIds(nodeId, value, children, propertyPath);
			}
		} else if (property.type === 'fixedCollection' && isRecord(value)) {
			const next = { ...value };
			result[property.name] = next;
			for (const collection of property.options?.filter(isINodePropertyCollection) ?? []) {
				const entries = value[collection.name];
				const collectionPath = [...propertyPath, collection.name];
				if (Array.isArray(entries)) {
					next[collection.name] = entries.map((entry: unknown, index) =>
						isRecord(entry)
							? addWorkflowGraphParameterIds(nodeId, entry, collection.values, [
									...collectionPath,
									index,
								])
							: entry,
					);
				} else if (isRecord(entries)) {
					next[collection.name] = addWorkflowGraphParameterIds(
						nodeId,
						entries,
						collection.values,
						collectionPath,
					);
				}
			}
		}
	}
	return result;
}
