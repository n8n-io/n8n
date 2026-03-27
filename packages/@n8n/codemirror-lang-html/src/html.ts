// import {parser, configureNesting} from "@lezer/html"
import { parser, configureNesting } from './grammar/index.js';
import { Parser } from '@lezer/common';
import { cssLanguage, css } from '@codemirror/lang-css';
import {
	javascriptLanguage,
	typescriptLanguage,
	jsxLanguage,
	tsxLanguage,
	javascript,
} from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import {
	LRLanguage,
	indentNodeProp,
	foldNodeProp,
	LanguageSupport,
	syntaxTree,
} from '@codemirror/language';
import { elementName, htmlCompletionSourceWith, TagSpec, eventAttributes } from './complete';
export { htmlCompletionSource, TagSpec, htmlCompletionSourceWith } from './complete';

type NestedLang = {
	tag: string;
	attrs?: (attrs: { [attr: string]: string }) => boolean;
	parser: Parser;
};

const defaultNesting: NestedLang[] = [
	{
		tag: 'script',
		attrs: (attrs) => attrs.type == 'text/typescript' || attrs.lang == 'ts',
		parser: typescriptLanguage.parser,
	},
	{
		tag: 'script',
		attrs: (attrs) => attrs.type == 'text/babel' || attrs.type == 'text/jsx',
		parser: jsxLanguage.parser,
	},
	{
		tag: 'script',
		attrs: (attrs) => attrs.type == 'text/typescript-jsx',
		parser: tsxLanguage.parser,
	},
	{
		tag: 'script',
		attrs(attrs) {
			return (
				!attrs.type ||
				/^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^module$|^$/i.test(attrs.type)
			);
		},
		parser: javascriptLanguage.parser,
	},
	{
		tag: 'style',
		attrs(attrs) {
			return (
				(!attrs.lang || attrs.lang == 'css') &&
				(!attrs.type || /^(text\/)?(x-)?(stylesheet|css)$/i.test(attrs.type))
			);
		},
		parser: cssLanguage.parser,
	},
];

type NestedAttr = {
	name: string;
	tagName?: string;
	parser: Parser;
};

const defaultAttrs: NestedAttr[] = [
	{ name: 'style', parser: cssLanguage.parser.configure({ top: 'Styles' }) },
].concat(eventAttributes.map((name) => ({ name, parser: javascriptLanguage.parser })));

/// A language provider based on the [Lezer HTML
/// parser](https://github.com/lezer-parser/html), extended with the
/// JavaScript and CSS parsers to parse the content of `<script>` and
/// `<style>` tags.
export const htmlLanguage = LRLanguage.define({
	name: 'html',
	parser: parser.configure({
		props: [
			indentNodeProp.add({
				Element(context) {
					let after = /^(\s*)(<\/)?/.exec(context.textAfter)!;
					if (context.node.to <= context.pos + after[0].length) return context.continue();
					return context.lineIndent(context.node.from) + (after[2] ? 0 : context.unit);
				},
				'OpenTag CloseTag SelfClosingTag'(context) {
					return context.column(context.node.from) + context.unit;
				},
				Document(context) {
					if (context.pos + /\s*/.exec(context.textAfter)![0].length < context.node.to)
						return context.continue();
					let endElt = null,
						close;
					for (let cur = context.node; ; ) {
						let last = cur.lastChild;
						if (!last || last.name != 'Element' || last.to != cur.to) break;
						endElt = cur = last;
					}
					if (
						endElt &&
						!(
							(close = endElt.lastChild) &&
							(close.name == 'CloseTag' || close.name == 'SelfClosingTag')
						)
					)
						return context.lineIndent(endElt.from) + context.unit;
					return null;
				},
			}),
			foldNodeProp.add({
				Element(node) {
					let first = node.firstChild,
						last = node.lastChild!;
					if (!first || first.name != 'OpenTag') return null;
					return { from: first.to, to: last.name == 'CloseTag' ? last.from : node.to };
				},
			}),
		],
		wrap: configureNesting(defaultNesting, defaultAttrs),
	}),
	languageData: {
		commentTokens: { block: { open: '<!--', close: '-->' } },
		indentOnInput: /^\s*<\/\w+\W$/,
		wordChars: '-._',
	},
});

/// Language support for HTML, including
/// [`htmlCompletion`](#lang-html.htmlCompletion) and JavaScript and
/// CSS support extensions.
export function html(
	config: {
		/// By default, the syntax tree will highlight mismatched closing
		/// tags. Set this to `false` to turn that off (for example when you
		/// expect to only be parsing a fragment of HTML text, not a full
		/// document).
		matchClosingTags?: boolean;
		// By default, the parser does not allow arbitrary self-closing tags.
		// Set this to `true` to turn on support for `/>` self-closing tag
		// syntax.
		selfClosingTags?: boolean;
		/// Determines whether [`autoCloseTags`](#lang-html.autoCloseTags)
		/// is included in the support extensions. Defaults to true.
		autoCloseTags?: boolean;
		/// Add additional tags that can be completed.
		extraTags?: Record<string, TagSpec>;
		/// Add additional completable attributes to all tags.
		extraGlobalAttributes?: Record<string, null | readonly string[]>;
		/// Register additional languages to parse the content of specific
		/// tags. If given, `attrs` should be a function that, given an
		/// object representing the tag's attributes, returns `true` if this
		/// language applies.
		nestedLanguages?: NestedLang[];
		/// Register additional languages to parse attribute values with.
		nestedAttributes?: NestedAttr[];
	} = {},
) {
	let dialect = '',
		wrap;
	if (config.matchClosingTags === false) dialect = 'noMatch';
	if (config.selfClosingTags === true) dialect = (dialect ? dialect + ' ' : '') + 'selfClosing';
	if (
		(config.nestedLanguages && config.nestedLanguages.length) ||
		(config.nestedAttributes && config.nestedAttributes.length)
	)
		wrap = configureNesting(
			(config.nestedLanguages || []).concat(defaultNesting),
			(config.nestedAttributes || []).concat(defaultAttrs),
		);
	let lang = wrap || dialect ? htmlLanguage.configure({ dialect, wrap }) : htmlLanguage;
	return new LanguageSupport(lang, [
		htmlLanguage.data.of({ autocomplete: htmlCompletionSourceWith(config) }),
		config.autoCloseTags !== false ? autoCloseTags : [],
		javascript().support,
		css().support,
	]);
}

/// Extension that will automatically insert close tags when a `>` or
/// `/` is typed.
export const autoCloseTags = EditorView.inputHandler.of((view, from, to, text) => {
	if (
		view.composing ||
		view.state.readOnly ||
		from != to ||
		(text != '>' && text != '/') ||
		!htmlLanguage.isActiveAt(view.state, from, -1)
	)
		return false;
	let { state } = view;
	let changes = state.changeByRange((range) => {
		let { head } = range,
			around = syntaxTree(state).resolveInner(head, -1),
			name;
		if (around.name == 'TagName' || around.name == 'StartTag') around = around.parent!;
		if (text == '>' && around.name == 'OpenTag') {
			if (
				around.parent?.lastChild?.name != 'CloseTag' &&
				(name = elementName(state.doc, around.parent, head))
			) {
				let hasRightBracket = view.state.doc.sliceString(head, head + 1) === '>';
				let insert = `${hasRightBracket ? '' : '>'}</${name}>`;
				return {
					range: EditorSelection.cursor(head + 1),
					changes: { from: head + (hasRightBracket ? 1 : 0), insert },
				};
			}
		} else if (text == '/' && around.name == 'OpenTag') {
			let empty = around.parent,
				base = empty?.parent;
			if (
				empty!.from == head - 1 &&
				base!.lastChild?.name != 'CloseTag' &&
				(name = elementName(state.doc, base, head))
			) {
				let hasRightBracket = view.state.doc.sliceString(head, head + 1) === '>';
				let insert = `/${name}${hasRightBracket ? '' : '>'}`;
				let pos = head + insert.length + (hasRightBracket ? 1 : 0);
				return { range: EditorSelection.cursor(pos), changes: { from: head, insert } };
			}
		}
		return { range };
	});
	if (changes.changes.empty) return false;
	view.dispatch(changes, { userEvent: 'input.type', scrollIntoView: true });
	return true;
});
