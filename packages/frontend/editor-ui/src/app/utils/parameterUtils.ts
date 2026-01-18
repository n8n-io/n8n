import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';
import type { ICredentialDataDecryptedObject, INodeParameters } from 'n8n-workflow';

const ARRAY_PATH_PATTERN = /(.*)\[(\d+)\]$/;

/**
 * Sets a parameter value at the given path, handling array deletions when value is undefined.
 * For array paths like 'items[1]', passing undefined will remove that array item.
 * For non-array paths, passing undefined will delete the property.
 */
export function setParameterValue(
	parameters: INodeParameters | ICredentialDataDecryptedObject | null,
	path: string,
	value: unknown,
): void {
	if (!parameters) return;

	const arrayPathMatch = path.match(ARRAY_PATH_PATTERN);

	if (value === undefined && arrayPathMatch) {
		deleteArrayItem(parameters, arrayPathMatch[1], parseInt(arrayPathMatch[2], 10));
	} else if (value === undefined) {
		unset(parameters, path);
	} else {
		set(parameters, path, value);
	}
}

function deleteArrayItem(
	parameters: INodeParameters | ICredentialDataDecryptedObject,
	arrayPath: string,
	index: number,
): void {
	const array = get(parameters, arrayPath);

	if (Array.isArray(array)) {
		array.splice(index, 1);
		set(parameters, arrayPath, array);
	}
}
