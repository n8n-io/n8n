import { ValidationError } from './ValidationError';

/**
 * Validates that no disallowed methods are used in the
 * runCodeForEachItem JS code. Throws `ValidationError` if
 * a disallowed method is found.
 */
export function validateNoDisallowedMethodsInRunForEach(code: string, itemIndex: number) {
	const match = code.match(/\$input\.(?<disallowedMethod>first|last|all|itemMatching)/);

	if (match?.groups?.disallowedMethod) {
		const { disallowedMethod } = match.groups;

		const lineNumber =
			code.split('\n').findIndex((line) => {
				line = line.trimStart();
				return (
					line.includes(disallowedMethod) &&
					!line.startsWith('//') &&
					!line.startsWith('/*') &&
					!line.startsWith('*')
				);
			}) + 1;

		const disallowedMethodFound = lineNumber !== 0;

		if (disallowedMethodFound) {
			throw new ValidationError({
				message: `Can't use .${disallowedMethod}() here`,
				description: "This is only available in 'Run Once for All Items' mode",
				itemIndex,
				lineNumber,
			});
		}
	}
}

/**
 * Checks if the error message indicates that `items` is not defined and
 * modifies the error message to suggest using `$input.all()`.
 */
export function mapItemsNotDefinedErrorIfNeededForRunForAll(code: string, error: Error) {
	// anticipate user expecting `items` to pre-exist as in Function Item node
	if (error.message === 'items is not defined' && !/(let|const|var) +items +=/.test(code)) {
		const quoted = error.message.replace('items', '`items`');
		error.message = quoted + '. Did you mean `$input.all()`?';
	}
}

/**
 * Maps the "item is not defined" error message to provide a more helpful suggestion
 * for users who may expect `items` to pre-exist
 */
export function mapItemNotDefinedErrorIfNeededForRunForEach(code: string, error: Error) {
	// anticipate user expecting `items` to pre-exist as in Function Item node
	if (error.message === 'item is not defined' && !/(let|const|var) +item +=/.test(code)) {
		const quoted = error.message.replace('item', '`item`');
		error.message = quoted + '. Did you mean `$input.item.json`?';
	}
}
