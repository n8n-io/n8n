import * as esprima from 'esprima-next';
import type { Completion } from '@codemirror/autocomplete';
import type { RangeNode } from './types';
import { sanitizeHtml } from '@/utils/htmlUtils';
import type { Node } from 'estree';

export function walk<T extends RangeNode>(
	node: Node | esprima.Program,
	test: (node: Node) => boolean,
	found: Node[] = [],
) {
	const isProgram = node.type === esprima.Syntax.Program;
	if (!isProgram && test(node)) found.push(node);

	if (isProgram) {
		node.body.forEach((n) => walk(n as Node, test, found));
	} else {
		for (const key in node) {
			if (!(key in node)) continue;

			// @ts-expect-error Node is not string indexable, but it has many possible properties
			const child = node[key];

			if (child === null || typeof child !== 'object') continue;

			if (Array.isArray(child)) {
				child.filter(Boolean).forEach((n) => walk(n, test, found));
			} else {
				walk(child, test, found);
			}
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

export const addInfoRenderer = (option: Completion): Completion => {
	const { info } = option;
	if (typeof info === 'string') {
		option.info = () => {
			const wrapper = document.createElement('span');
			wrapper.innerHTML = sanitizeHtml(info);
			return wrapper;
		};
	}
	return option;
};
