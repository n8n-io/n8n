import get from 'lodash/get';
import type { IDataObject, INodeTypeDescription, OutputFieldRendering } from 'n8n-workflow';

type Declaring = Pick<INodeTypeDescription, 'outputFieldRendering'> | null | undefined;

/**
 * Paths into `item.json` that a node type declares as documents of the given
 * kind, in declaration order.
 */
export function renderedFieldPaths(nodeType: Declaring, kind: OutputFieldRendering): string[] {
	const rendering = nodeType?.outputFieldRendering ?? {};

	return Object.keys(rendering).filter((path) => rendering[path] === kind);
}

export function isRenderedField(
	nodeType: Declaring,
	kind: OutputFieldRendering,
	path: string,
): boolean {
	return nodeType?.outputFieldRendering?.[path] === kind;
}

/** The declared field's value, only when it is a non-empty string. */
export function renderedFieldValue(json: IDataObject | undefined, path: string): string {
	const value = json === undefined ? undefined : get(json, path);

	return typeof value === 'string' && value.length > 0 ? value : '';
}

/**
 * A vue-json-pretty node path (`[0].html`, `.html`) as a path relative to
 * `item.json`, so it can be matched against a declaration.
 */
export function fieldPathFromJsonPath(jsonPath: string): string {
	return jsonPath.replace(/^\[\d+\]/, '').replace(/^\./, '');
}
