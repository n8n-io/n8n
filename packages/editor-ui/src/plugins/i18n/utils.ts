/**
 * Derive the middle key, i.e. the segment of the render key located between
 * the initial key (path to parameters root) and the property.
 *
 * Needed in `nodeText()` because of possibly deeply nested params.
 *
 * Location: `n8n-nodes-base.nodes.github.nodeView.${middleKey}.placeholder`
 */
export function deriveMiddleKey(
	path: string,
	parameter: { name: string; type: string; },
) {
	let middleKey = parameter.name;

	if (isOptionInCollection(path)) {
		const [collectionName, optionName] = sanitize(path).split('.');
		middleKey = `${collectionName}.options.${optionName}`;
	}

	if (isOptionInFixedCollection(path)) {
		const pathSegments = sanitize(path).split('.');
		middleKey = insertOptionsAndValues(pathSegments).join('.');
	}

	if (isFixedCollection(parameter) && path !== 'parameters') {
		const pathSegments = [...sanitize(path).split('.'), parameter.name];
		middleKey = insertOptionsAndValues(pathSegments).join('.');
	}

	return middleKey;
}

/**
 * Check if a param path indicates that it is an option inside a `collection` param.
 */
export const isOptionInCollection = (path: string) => path.split('.').length === 3;

/**
 * Check if a param path indicates that it is an option inside a `fixedCollection` param.
 */
export const isOptionInFixedCollection = (path: string) => path.split('.').length > 3;

/**
 * Check if a param path indicates that it itself is a `fixedCollection` param.
 */
export const isFixedCollection = (parameter: { type: string }) => parameter.type === 'fixedCollection';

/**
 * Remove all indices and the `parameters.` prefix from a parameter path.
 * Example: `parameters.a[0].b` → `a.b`
 */
export const sanitize = (path: string) => path.replace(/\[.*?\]/g, '').replace('parameters.', '');

/**
 * Insert `'options'` and `'values'` into an array on an alternating basis.
 * Example: `['a', 'b', 'c']` → `['a', 'options', 'b', 'values', 'c']`
 */
export const insertOptionsAndValues = (pathSegments: string[]) => {
	return pathSegments.reduce<string[]>((acc, cur, i) => {
		acc.push(cur);

		if (i === pathSegments.length - 1) return acc;

		acc.push(i % 2 === 0 ? 'options' : 'values');

		return acc;
	}, []);
};
