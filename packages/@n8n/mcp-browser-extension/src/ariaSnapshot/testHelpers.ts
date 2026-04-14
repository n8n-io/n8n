/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Shared test helpers for ariaSnapshot tests.
 *
 * Provides factory functions for constructing CDP accessibility nodes
 * and mock attribute fetchers used across build/print/diff test suites.
 */

import type { Protocol } from 'devtools-protocol';

import type { TreeNode } from './types';

export const roleVal = (value: string): Protocol.Accessibility.AXValue => ({
	type: 'role',
	value,
});

export const nameVal = (value: string): Protocol.Accessibility.AXValue => ({
	type: 'string',
	value,
});

/** No-op fetchAttributes — returns empty attrs (no test-ID, no id) */
export const noAttrs = async (_id: number): Promise<string[]> => await Promise.resolve([]);

/** Build a fetchAttributes mock that returns given attrs for given backendNodeIds */
export function attrsMock(map: Record<number, string[]>): (id: number) => Promise<string[]> {
	return async (id: number) => await Promise.resolve(map[id] ?? []);
}

export const boolProp = (
	name: string,
	value: boolean | string = true,
): Protocol.Accessibility.AXProperty => ({
	name: name as Protocol.Accessibility.AXPropertyName,
	value: { type: typeof value === 'string' ? 'string' : 'tristate', value },
});

export const intProp = (name: string, value: number): Protocol.Accessibility.AXProperty => ({
	name: name as Protocol.Accessibility.AXPropertyName,
	value: { type: 'integer', value },
});

export function axNode(
	nodeId: string,
	role: string,
	opts: {
		name?: string;
		childIds?: string[];
		backendDOMNodeId?: number;
		ignored?: boolean;
		parentId?: string;
		properties?: Protocol.Accessibility.AXProperty[];
	} = {},
): Protocol.Accessibility.AXNode {
	return {
		nodeId,
		role: roleVal(role),
		name: opts.name !== undefined ? nameVal(opts.name) : undefined,
		childIds: opts.childIds ?? [],
		backendDOMNodeId: opts.backendDOMNodeId,
		ignored: opts.ignored ?? false,
		parentId: opts.parentId,
		properties: opts.properties,
	};
}

export function flattenNodes(nodes: TreeNode[]): TreeNode[] {
	return nodes.flatMap((n) => [n, ...flattenNodes(n.children)]);
}
