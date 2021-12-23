/**
 * Check if a param path indicates that the param is inside a `collection` param.
 * Example: `label` in `parameters.labels[0].label`
 */
export function isForCollection(path: string | undefined): path is string {
	if (!path) return false;

	return /[\]\]]/.test(path);
}

/**
 * Check if a param path indicates that the param is inside a `fixedCollection` param.
 * Example: `email` in `parameters.additionalParameters.author.email`
 * // TODO i18n: deeper nesting e.g. slack node
 */
export function isForFixedCollection(path: string | undefined): path is string {
	if (!path) return false;

	console.log(path);

	return path.split('.').length === 4;
}

/**
 * Generate the render key for the section title inside a `fixedCollection` param.
 */
export function toSectionTitleKey(path: string, optionName: string) {
	const fixedCollectionName = removeParams(path);

	return `${fixedCollectionName}.options.${optionName}`;
}

/**
 * Generate the render key for a param inside a `collection` param.
 */
export function toCollectionKey(path: string) {
	return removeParams(path).replace(/\[\d\]/, '.options');
}

/**
 * Generate the render key for a param inside a `fixedCollection` param.
 * TODO i18n: deeper nesting e.g. slack node
 */
export function toFixedCollectionKey(path: string) {
	const [ fixedCollectionName, optionName, valueName ] = removeParams(path).split('.');

	return `${fixedCollectionName}.options.${optionName}.values.${valueName}`;
}

const removeParams = (path: string) => path.replace('parameters.', '');
