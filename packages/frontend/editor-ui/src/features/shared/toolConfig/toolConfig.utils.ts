import type { INodeTypeDescription } from 'n8n-workflow';
import { deepCopy, isINodePropertyOptions } from 'n8n-workflow';

/**
 * Returns a copy of the description with the given option values removed from
 * every `resource` or `operation` property. Defaults pointing at a removed
 * option are remapped to the first remaining option.
 */
export function omitOperationOptions(
	description: INodeTypeDescription,
	optionValues: readonly string[],
): INodeTypeDescription {
	const copy = deepCopy(description);

	for (const property of copy.properties) {
		if (
			(property.name !== 'resource' && property.name !== 'operation') ||
			!Array.isArray(property.options)
		)
			continue;

		property.options = property.options.filter(
			(option) =>
				!isINodePropertyOptions(option) ||
				typeof option.value !== 'string' ||
				!optionValues.includes(option.value),
		);

		if (typeof property.default !== 'string' || !optionValues.includes(property.default)) continue;

		const firstRemainingOption = property.options.find(isINodePropertyOptions);
		if (firstRemainingOption) property.default = firstRemainingOption.value;
	}

	return copy;
}
