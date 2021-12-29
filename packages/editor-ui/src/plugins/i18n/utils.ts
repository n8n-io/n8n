/**
 * Derive the middle key, i.e. the segment of the render key located between
 * the initial key (path to parameters root) and the property to render.
 *
 * Used by `nodeText()` to handle nested params.
 *
 * Location: `n8n-nodes-base.nodes.github.nodeView.<middleKey>.placeholder`
 */
export function deriveMiddleKey(
	path: string,
	parameter: { name: string; type: string; },
) {
	let middleKey = parameter.name;

	if (
		isTopLevelCollection(path, parameter) ||
		isNestedInCollectionLike(path)
	) {
		const pathSegments = normalize(path).split('.');
		middleKey = insertOptionsAndValues(pathSegments).join('.');
	}

	if (
		isNestedCollection(path, parameter) ||
		isFixedCollection(path, parameter)
	) {
		const pathSegments = [...normalize(path).split('.'), parameter.name];
		middleKey = insertOptionsAndValues(pathSegments).join('.');
	}

	return middleKey;
}

/**
 * Check if a param path is for a param nested inside a `collection` or
 * `fixedCollection` param.
 */
export const isNestedInCollectionLike = (path: string) => path.split('.').length >= 3;

const isTopLevelCollection = (path: string, parameter: { type: string }) =>
	path.split('.').length === 2 && parameter.type === 'collection';

const isNestedCollection = (path: string, parameter: { type: string }) =>
	path.split('.').length > 2 && parameter.type === 'collection';

/**
 * Check if the param is a normal `fixedCollection`, i.e. a FC other than the wrapper
 * that sits at the root of a node's top-level param and contains all of them.
 */
const isFixedCollection = (path: string, parameter: { type: string }) =>
	parameter.type === 'fixedCollection' && path !== 'parameters';

/**
 * Remove all indices and the `parameters.` prefix from a parameter path.
 *
 * Example: `parameters.a[0].b` → `a.b`
 */
export const normalize = (path: string) => path.replace(/\[.*?\]/g, '').replace('parameters.', '');

/**
 * Insert `'options'` and `'values'` on an alternating basis in a string array of
 * indefinite length. Helper to create a valid render key for a collection-like param.
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
