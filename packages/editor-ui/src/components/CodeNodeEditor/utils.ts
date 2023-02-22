import * as esprima from 'esprima-next';
import type { Completion } from '@codemirror/autocomplete';
import type { Node } from 'estree';
import type { RangeNode } from './types';

export function walk<T extends RangeNode>(
	node: Node | esprima.Program,
	test: (node: Node) => boolean,
	found: Node[] = [],
) {
	// @ts-ignore
	if (test(node)) found.push(node);

	for (const key in node) {
		if (!(key in node)) continue;

		// @ts-ignore
		const child = node[key];

		if (child === null || typeof child !== 'object') continue;

		if (Array.isArray(child)) {
			child.forEach((node) => walk(node, test, found));
		} else {
			walk(child, test, found);
		}
	}

	return found as T[];
}

export const escape = (str: string) =>
	str
		.replace('$', '\\$')
		.replace('(', '\\(')
		.replace(')', '\\)')
		.replace('[', '\\[')
		.replace(']', '\\]');

export const toVariableOption = (label: string) => ({ label, type: 'variable' });

export const addVarType = (option: Completion) => ({ ...option, type: 'variable' });
