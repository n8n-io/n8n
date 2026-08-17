import type { INodeTypeDescription } from 'n8n-workflow';
import { deepCopy, isINodePropertyOptions } from 'n8n-workflow';

/**
 * Returns a copy of the description with the given operation option values
 * removed from every `operation` property. Defaults pointing at a removed
 * operation are remapped to the first remaining option.
 */
export function omitOperationOptions(
	description: INodeTypeDescription,
	operations: readonly string[],
): INodeTypeDescription {
	const copy = deepCopy(description);

	for (const property of copy.properties) {
		if (property.name !== 'operation' || !Array.isArray(property.options)) continue;

		property.options = property.options.filter(
			(option) =>
				!isINodePropertyOptions(option) ||
				typeof option.value !== 'string' ||
				!operations.includes(option.value),
		);

		if (typeof property.default !== 'string' || !operations.includes(property.default)) continue;

		const firstRemainingOption = property.options.find(isINodePropertyOptions);
		if (firstRemainingOption) property.default = firstRemainingOption.value;
	}

	return copy;
}
