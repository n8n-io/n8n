import * as esprima from 'esprima-next';
import type { Completion } from '@codemirror/autocomplete';
import type { RangeNode } from './types';
import { sanitizeHtml } from '@/utils/htmlUtils';
import type { Node } from 'estree';
import type { CodeNodeLanguageOption } from './CodeNodeEditor.vue';
import type { CodeExecutionMode } from 'n8n-workflow';

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

const DOT_CHAINS = /((?:\.[A-Za-z_$][A-Za-z0-9_$]*)+)/g;
const DOT_KEY = /\.(?<key>[A-Za-z_$][A-Za-z0-9_$]*)/g;

// Convert dot notation ".a.b.c" chains -> ["a"]["b"]["c"]
const toBracketNotation = (input: string): string => {
	return input.replace(DOT_CHAINS, (chain) => chain.replace(DOT_KEY, '["$<key>"]'));
};

const pythonInsert = (value: string, mode: CodeExecutionMode): string => {
	const base =
		mode === 'runOnceForAllItems'
			? value.replace('$json', '_items[0]["json"]')
			: value.replace('$json', '_item["json"]');

	return toBracketNotation(base);
};

const pyodideInsert = (value: string, mode: CodeExecutionMode): string => {
	return value
		.replace('$json', mode === 'runOnceForAllItems' ? '_input.first().json' : '_input.item.json')
		.replace(/\$\((.*)\)\.item/, mode === 'runOnceForAllItems' ? '_($1).first()' : '_($1).item');
};

const jsInsertForAllItems = (value: string): string => {
	return value.replace('$json', '$input.first().json').replace(/\$\((.*)\)\.item/, '$($1).first()');
};

const isPyodide = (language: CodeNodeLanguageOption) => language === 'python';
const isPython = (language: CodeNodeLanguageOption) => language === 'pythonNative';

export const valueToInsert = (
	value: string,
	language: CodeNodeLanguageOption,
	mode: CodeExecutionMode,
): string => {
	if (isPython(language)) return pythonInsert(value, mode);
	if (isPyodide(language)) return pyodideInsert(value, mode);
	if (mode === 'runOnceForAllItems') return jsInsertForAllItems(value);

	return value;
};
