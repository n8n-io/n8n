import type { Completion, CompletionContext, CompletionSource } from '@codemirror/autocomplete';
import { completeFromList, ifNotIn } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Text } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

import { Type, Keyword } from './grammar.sql.terms';

const skippedTokens = ['Whitespace'];

function tokenBefore(tree: SyntaxNode) {
	const cursor = tree.cursor().moveTo(tree.from, -1);
	while (/Comment/.test(cursor.name)) cursor.moveTo(cursor.from, -1);
	return cursor.node;
}

function idName(doc: Text, node: SyntaxNode): string {
	const text = doc.sliceString(node.from, node.to);
	const quoted = /^([`'"])(.*)\1$/.exec(text);
	return quoted ? quoted[2] : text;
}

function plainID(node: SyntaxNode | null) {
	return node && (node.name === 'Identifier' || node.name === 'QuotedIdentifier');
}

function pathFor(doc: Text, id: SyntaxNode) {
	if (id.name === 'CompositeIdentifier') {
		const path: string[] = [];
		for (let ch = id.firstChild; ch; ch = ch.nextSibling)
			if (plainID(ch)) path.push(idName(doc, ch));
		return path;
	}
	return [idName(doc, id)];
}

function parentsFor(doc: Text, node: SyntaxNode | null) {
	for (let path: string[] = []; ; ) {
		if (!node || node.name !== '.') return path;
		const name = tokenBefore(node);
		if (!plainID(name)) return path;
		path.unshift(idName(doc, name));
		node = tokenBefore(name);
	}
}

function sourceContext(state: EditorState, startPos: number) {
	const pos = syntaxTree(state).resolveInner(startPos, -1);
	const aliases = getAliases(state.doc, pos);
	if (pos.name === 'Identifier' || pos.name === 'QuotedIdentifier' || pos.name === 'Keyword') {
		return {
			from: pos.from,
			quoted:
				pos.name === 'QuotedIdentifier' ? state.doc.sliceString(pos.from, pos.from + 1) : null,
			parents: parentsFor(state.doc, tokenBefore(pos)),
			aliases,
		};
	}
	if (pos.name === '.') {
		return { from: startPos, quoted: null, parents: parentsFor(state.doc, pos), aliases };
	} else {
		return { from: startPos, quoted: null, parents: [], empty: true, aliases };
	}
}

const EndFrom = new Set(
	'where group having order union intersect except all distinct limit offset fetch for'.split(' '),
);

function getAliases(doc: Text, at: SyntaxNode) {
	let statement;
	for (let parent: SyntaxNode | null = at; !statement; parent = parent.parent) {
		if (!parent) return null;
		if (parent.name === 'Statement') statement = parent;
	}
	let aliases: { [name: string]: string[] } | null = null;
	for (
		let scan = statement.firstChild, sawFrom = false, prevID: SyntaxNode | null = null;
		scan;
		scan = scan.nextSibling
	) {
		if (skippedTokens.includes(scan.name)) continue;
		const kw = scan.name === 'Keyword' ? doc.sliceString(scan.from, scan.to).toLowerCase() : null;
		let alias: string | null = null;
		if (!sawFrom) {
			sawFrom = kw === 'from';
		} else if (kw === 'as' && prevID) {
			let next = scan.nextSibling;
			while (next && skippedTokens.includes(next.name)) next = next.nextSibling;
			if (plainID(next)) alias = idName(doc, next!);
		} else if (kw && EndFrom.has(kw)) {
			break;
		} else if (prevID && plainID(scan)) {
			alias = idName(doc, scan);
		}
		if (alias) {
			aliases ??= Object.create(null);
			if (aliases) {
				aliases[alias] = pathFor(doc, prevID!);
			}
		}
		prevID = /Identifier$/.test(scan.name) ? scan : null;
	}
	return aliases;
}

function maybeQuoteCompletions(quote: string | null, completions: readonly Completion[]) {
	if (!quote) return completions;
	return completions.map((c) => ({ ...c, label: quote + c.label + quote, apply: undefined }));
}

const Span = /^\w*$/,
	QuotedSpan = /^[`'"]?\w*[`'"]?$/;

class CompletionLevel {
	list: readonly Completion[] = [];
	children: { [name: string]: CompletionLevel } | undefined = undefined;

	child(name: string): CompletionLevel {
		const children =
			this.children || (this.children = Object.create(null) as { [name: string]: CompletionLevel });
		return children[name] || (children[name] = new CompletionLevel());
	}

	childCompletions(type: string) {
		return this.children
			? Object.keys(this.children)
					.filter((x) => x)
					.map((name) => ({ label: name, type }) as Completion)
			: [];
	}
}

export function completeFromSchema(
	schema: { [table: string]: ReadonlyArray<string | Completion> },
	tables?: readonly Completion[],
	schemas?: readonly Completion[],
	defaultTableName?: string,
	defaultSchemaName?: string,
): CompletionSource {
	const top = new CompletionLevel();
	const defaultSchema = top.child(defaultSchemaName || '');
	for (const table in schema) {
		const dot = table.indexOf('.');
		const schemaCompletions = dot > -1 ? top.child(table.slice(0, dot)) : defaultSchema;
		const tableCompletions = schemaCompletions.child(dot > -1 ? table.slice(dot + 1) : table);
		tableCompletions.list = schema[table].map((val) =>
			typeof val === 'string' ? { label: val, type: 'property' } : val,
		);
	}
	defaultSchema.list = (tables || defaultSchema.childCompletions('type')).concat(
		defaultTableName ? defaultSchema.child(defaultTableName).list : [],
	);
	for (const sName in top.children) {
		const schema = top.child(sName);
		if (!schema.list.length) schema.list = schema.childCompletions('type');
	}
	top.list = defaultSchema.list.concat(schemas || top.childCompletions('type'));

	return (context: CompletionContext) => {
		// eslint-disable-next-line prefer-const
		let { parents, from, quoted, empty, aliases } = sourceContext(context.state, context.pos);
		if (empty && !context.explicit) return null;
		if (aliases && parents.length === 1) parents = aliases[parents[0]] || parents;
		let level = top;
		for (const name of parents) {
			while (!level.children?.[name]) {
				if (level === top) level = defaultSchema;
				else if (level === defaultSchema && defaultTableName) level = level.child(defaultTableName);
				else return null;
			}
			level = level.child(name);
		}
		const quoteAfter = quoted && context.state.sliceDoc(context.pos, context.pos + 1) === quoted;
		let options = level.list;
		if (level === top && aliases)
			options = options.concat(
				Object.keys(aliases).map((name) => ({ label: name, type: 'constant' })),
			);
		return {
			from,
			to: quoteAfter ? context.pos + 1 : undefined,
			options: maybeQuoteCompletions(quoted, options),
			validFor: quoted ? QuotedSpan : Span,
		};
	};
}

export function completeKeywords(keywords: { [name: string]: number }, upperCase: boolean) {
	const completions = Object.keys(keywords).map((keyword) => ({
		label: upperCase ? keyword.toUpperCase() : keyword,
		type:
			keywords[keyword] === Type ? 'type' : keywords[keyword] === Keyword ? 'keyword' : 'variable',
		boost: -1,
	}));
	return ifNotIn(
		['QuotedIdentifier', 'SpecialVar', 'String', 'LineComment', 'BlockComment', '.'],
		completeFromList(completions),
	);
}
