/**
 * Derive the middle key, i.e. the segment of the render key located between
 * the initial key (path to parameters root) and the property.
 *
 * Required by `nodeText()` to handle nested params.
 *
 * Location: `n8n-nodes-base.nodes.github.nodeView.${middleKey}.placeholder`
 */
export function deriveMiddleKey(
	path: string,
	parameter: { name: string; type: string; },
) {
	let middleKey = parameter.name;

	if (isNestedInCollectionLike(path)) {
		const pathSegments = normalize(path).split('.');
		middleKey = insertOptionsAndValues(pathSegments).join('.');
	}

	if (
		isCollection(parameter) ||
		(isFixedCollection(parameter) && isNotRootPath(path))
	) {
		const pathSegments = [...normalize(path).split('.'), parameter.name];
		middleKey = insertOptionsAndValues(pathSegments).join('.');
	}

	return middleKey;
}

/**
 * Check if a param path indicates that the param is nested inside a `collection`
 * or `fixedCollection` param.
 */
export const isNestedInCollectionLike = (path: string) => path.split('.').length > 3;

/**
 * Check if a param is a `collection`.
 */
const isCollection = (parameter: { type: string }) => parameter.type === 'collection';

/**
 * Check if a param is a `fixedCollection`.
 */
const isFixedCollection = (parameter: { type: string }) => parameter.type === 'fixedCollection';

/**
 * Check if a path is not the root path that is a fixed collection containing all node params.
 */
const isNotRootPath = (path: string) => path !== 'parameters';

/**
 * Remove all indices and the `parameters.` prefix from a parameter path.
 *
 * Example: `parameters.a[0].b` → `a.b`
 */
export const normalize = (path: string) => path.replace(/\[.*?\]/g, '').replace('parameters.', '');

/**
 * Insert `'options'` and `'values'` into an array on an alternating basis in an array of
 * indefinite length, for use as a valid render key for a collection-like param.
 *
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
