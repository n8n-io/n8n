import { EditorState, Text } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { SyntaxNode } from '@lezer/common';

/// Type used to specify tags to complete.
export interface TagSpec {
	/// Define tag-specific attributes. Property names are attribute
	/// names, and property values can be null to indicate free-form
	/// attributes, or a list of strings for suggested attribute values.
	attrs?: Record<string, null | readonly string[]>;
	/// When set to false, don't complete global attributes on this tag.
	globalAttrs?: boolean;
	/// Can be used to specify a list of child tags that are valid
	/// inside this tag. The default is to allow any tag.
	children?: readonly string[];
}

const Targets = ['_blank', '_self', '_top', '_parent'];
const Charsets = ['ascii', 'utf-8', 'utf-16', 'latin1'];
const Methods = ['get', 'post', 'put', 'delete'];
const Encs = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];
const Bool = ['true', 'false'];

const S: TagSpec = {}; // Empty tag spec

const Tags: Record<string, TagSpec> = {
	a: {
		attrs: {
			href: null,
			ping: null,
			type: null,
			media: null,
			target: Targets,
			hreflang: null,
		},
	},
	abbr: S,
	address: S,
	area: {
		attrs: {
			alt: null,
			coords: null,
			href: null,
			target: null,
			ping: null,
			media: null,
			hreflang: null,
			type: null,
			shape: ['default', 'rect', 'circle', 'poly'],
		},
	},
	article: S,
	aside: S,
	audio: {
		attrs: {
			src: null,
			mediagroup: null,
			crossorigin: ['anonymous', 'use-credentials'],
			preload: ['none', 'metadata', 'auto'],
			autoplay: ['autoplay'],
			loop: ['loop'],
			controls: ['controls'],
		},
	},
	b: S,
	base: { attrs: { href: null, target: Targets } },
	bdi: S,
	bdo: S,
	blockquote: { attrs: { cite: null } },
	body: S,
	br: S,
	button: {
		attrs: {
			form: null,
			formaction: null,
			name: null,
			value: null,
			autofocus: ['autofocus'],
			disabled: ['disabled'],
			formenctype: Encs,
			formmethod: Methods,
			formnovalidate: ['novalidate'],
			formtarget: Targets,
			type: ['submit', 'reset', 'button'],
		},
	},
	canvas: { attrs: { width: null, height: null } },
	caption: S,
	center: S,
	cite: S,
	code: S,
	col: { attrs: { span: null } },
	colgroup: { attrs: { span: null } },
	command: {
		attrs: {
			type: ['command', 'checkbox', 'radio'],
			label: null,
			icon: null,
			radiogroup: null,
			command: null,
			title: null,
			disabled: ['disabled'],
			checked: ['checked'],
		},
	},
	data: { attrs: { value: null } },
	datagrid: { attrs: { disabled: ['disabled'], multiple: ['multiple'] } },
	datalist: { attrs: { data: null } },
	dd: S,
	del: { attrs: { cite: null, datetime: null } },
	details: { attrs: { open: ['open'] } },
	dfn: S,
	div: S,
	dl: S,
	dt: S,
	em: S,
	embed: { attrs: { src: null, type: null, width: null, height: null } },
	eventsource: { attrs: { src: null } },
	fieldset: { attrs: { disabled: ['disabled'], form: null, name: null } },
	figcaption: S,
	figure: S,
	footer: S,
	form: {
		attrs: {
			action: null,
			name: null,
			'accept-charset': Charsets,
			autocomplete: ['on', 'off'],
			enctype: Encs,
			method: Methods,
			novalidate: ['novalidate'],
			target: Targets,
		},
	},
	h1: S,
	h2: S,
	h3: S,
	h4: S,
	h5: S,
	h6: S,
	head: {
		children: ['title', 'base', 'link', 'style', 'meta', 'script', 'noscript', 'command'],
	},
	header: S,
	hgroup: S,
	hr: S,
	html: {
		attrs: { manifest: null },
	},
	i: S,
	iframe: {
		attrs: {
			src: null,
			srcdoc: null,
			name: null,
			width: null,
			height: null,
			sandbox: ['allow-top-navigation', 'allow-same-origin', 'allow-forms', 'allow-scripts'],
			seamless: ['seamless'],
		},
	},
	img: {
		attrs: {
			alt: null,
			src: null,
			ismap: null,
			usemap: null,
			width: null,
			height: null,
			crossorigin: ['anonymous', 'use-credentials'],
		},
	},
	input: {
		attrs: {
			alt: null,
			dirname: null,
			form: null,
			formaction: null,
			height: null,
			list: null,
			max: null,
			maxlength: null,
			min: null,
			name: null,
			pattern: null,
			placeholder: null,
			size: null,
			src: null,
			step: null,
			value: null,
			width: null,
			accept: ['audio/*', 'video/*', 'image/*'],
			autocomplete: ['on', 'off'],
			autofocus: ['autofocus'],
			checked: ['checked'],
			disabled: ['disabled'],
			formenctype: Encs,
			formmethod: Methods,
			formnovalidate: ['novalidate'],
			formtarget: Targets,
			multiple: ['multiple'],
			readonly: ['readonly'],
			required: ['required'],
			type: [
				'hidden',
				'text',
				'search',
				'tel',
				'url',
				'email',
				'password',
				'datetime',
				'date',
				'month',
				'week',
				'time',
				'datetime-local',
				'number',
				'range',
				'color',
				'checkbox',
				'radio',
				'file',
				'submit',
				'image',
				'reset',
				'button',
			],
		},
	},
	ins: { attrs: { cite: null, datetime: null } },
	kbd: S,
	keygen: {
		attrs: {
			challenge: null,
			form: null,
			name: null,
			autofocus: ['autofocus'],
			disabled: ['disabled'],
			keytype: ['RSA'],
		},
	},
	label: { attrs: { for: null, form: null } },
	legend: S,
	li: { attrs: { value: null } },
	link: {
		attrs: {
			href: null,
			type: null,
			hreflang: null,
			media: null,
			sizes: ['all', '16x16', '16x16 32x32', '16x16 32x32 64x64'],
		},
	},
	map: { attrs: { name: null } },
	mark: S,
	menu: { attrs: { label: null, type: ['list', 'context', 'toolbar'] } },
	meta: {
		attrs: {
			content: null,
			charset: Charsets,
			name: ['viewport', 'application-name', 'author', 'description', 'generator', 'keywords'],
			'http-equiv': ['content-language', 'content-type', 'default-style', 'refresh'],
		},
	},
	meter: { attrs: { value: null, min: null, low: null, high: null, max: null, optimum: null } },
	nav: S,
	noscript: S,
	object: {
		attrs: {
			data: null,
			type: null,
			name: null,
			usemap: null,
			form: null,
			width: null,
			height: null,
			typemustmatch: ['typemustmatch'],
		},
	},
	ol: {
		attrs: { reversed: ['reversed'], start: null, type: ['1', 'a', 'A', 'i', 'I'] },
		children: ['li', 'script', 'template', 'ul', 'ol'],
	},
	optgroup: { attrs: { disabled: ['disabled'], label: null } },
	option: { attrs: { disabled: ['disabled'], label: null, selected: ['selected'], value: null } },
	output: { attrs: { for: null, form: null, name: null } },
	p: S,
	param: { attrs: { name: null, value: null } },
	pre: S,
	progress: { attrs: { value: null, max: null } },
	q: { attrs: { cite: null } },
	rp: S,
	rt: S,
	ruby: S,
	samp: S,
	script: {
		attrs: {
			type: ['text/javascript'],
			src: null,
			async: ['async'],
			defer: ['defer'],
			charset: Charsets,
		},
	},
	section: S,
	select: {
		attrs: {
			form: null,
			name: null,
			size: null,
			autofocus: ['autofocus'],
			disabled: ['disabled'],
			multiple: ['multiple'],
		},
	},
	slot: { attrs: { name: null } },
	small: S,
	source: { attrs: { src: null, type: null, media: null } },
	span: S,
	strong: S,
	style: {
		attrs: {
			type: ['text/css'],
			media: null,
			scoped: null,
		},
	},
	sub: S,
	summary: S,
	sup: S,
	table: S,
	tbody: S,
	td: { attrs: { colspan: null, rowspan: null, headers: null } },
	template: S,
	textarea: {
		attrs: {
			dirname: null,
			form: null,
			maxlength: null,
			name: null,
			placeholder: null,
			rows: null,
			cols: null,
			autofocus: ['autofocus'],
			disabled: ['disabled'],
			readonly: ['readonly'],
			required: ['required'],
			wrap: ['soft', 'hard'],
		},
	},
	tfoot: S,
	th: {
		attrs: {
			colspan: null,
			rowspan: null,
			headers: null,
			scope: ['row', 'col', 'rowgroup', 'colgroup'],
		},
	},
	thead: S,
	time: { attrs: { datetime: null } },
	title: S,
	tr: S,
	track: {
		attrs: {
			src: null,
			label: null,
			default: null,
			kind: ['subtitles', 'captions', 'descriptions', 'chapters', 'metadata'],
			srclang: null,
		},
	},
	ul: { children: ['li', 'script', 'template', 'ul', 'ol'] },
	var: S,
	video: {
		attrs: {
			src: null,
			poster: null,
			width: null,
			height: null,
			crossorigin: ['anonymous', 'use-credentials'],
			preload: ['auto', 'metadata', 'none'],
			autoplay: ['autoplay'],
			mediagroup: ['movie'],
			muted: ['muted'],
			controls: ['controls'],
		},
	},
	wbr: S,
};

const GlobalAttrs: Record<string, null | readonly string[]> = {
	accesskey: null,
	class: null,
	contenteditable: Bool,
	contextmenu: null,
	dir: ['ltr', 'rtl', 'auto'],
	draggable: ['true', 'false', 'auto'],
	dropzone: ['copy', 'move', 'link', 'string:', 'file:'],
	hidden: ['hidden'],
	id: null,
	inert: ['inert'],
	itemid: null,
	itemprop: null,
	itemref: null,
	itemscope: ['itemscope'],
	itemtype: null,
	lang: [
		'ar',
		'bn',
		'de',
		'en-GB',
		'en-US',
		'es',
		'fr',
		'hi',
		'id',
		'ja',
		'pa',
		'pt',
		'ru',
		'tr',
		'zh',
	],
	spellcheck: Bool,
	autocorrect: Bool,
	autocapitalize: Bool,
	style: null,
	tabindex: null,
	title: null,
	translate: ['yes', 'no'],
	rel: [
		'stylesheet',
		'alternate',
		'author',
		'bookmark',
		'help',
		'license',
		'next',
		'nofollow',
		'noreferrer',
		'prefetch',
		'prev',
		'search',
		'tag',
	],
	role: 'alert application article banner button cell checkbox complementary contentinfo dialog document feed figure form grid gridcell heading img list listbox listitem main navigation region row rowgroup search switch tab table tabpanel textbox timer'.split(
		' ',
	),
	'aria-activedescendant': null,
	'aria-atomic': Bool,
	'aria-autocomplete': ['inline', 'list', 'both', 'none'],
	'aria-busy': Bool,
	'aria-checked': ['true', 'false', 'mixed', 'undefined'],
	'aria-controls': null,
	'aria-describedby': null,
	'aria-disabled': Bool,
	'aria-dropeffect': null,
	'aria-expanded': ['true', 'false', 'undefined'],
	'aria-flowto': null,
	'aria-grabbed': ['true', 'false', 'undefined'],
	'aria-haspopup': Bool,
	'aria-hidden': Bool,
	'aria-invalid': ['true', 'false', 'grammar', 'spelling'],
	'aria-label': null,
	'aria-labelledby': null,
	'aria-level': null,
	'aria-live': ['off', 'polite', 'assertive'],
	'aria-multiline': Bool,
	'aria-multiselectable': Bool,
	'aria-owns': null,
	'aria-posinset': null,
	'aria-pressed': ['true', 'false', 'mixed', 'undefined'],
	'aria-readonly': Bool,
	'aria-relevant': null,
	'aria-required': Bool,
	'aria-selected': ['true', 'false', 'undefined'],
	'aria-setsize': null,
	'aria-sort': ['ascending', 'descending', 'none', 'other'],
	'aria-valuemax': null,
	'aria-valuemin': null,
	'aria-valuenow': null,
	'aria-valuetext': null,
};

export const eventAttributes = (
	'beforeunload copy cut dragstart dragover dragleave dragenter dragend ' +
	'drag paste focus blur change click load mousedown mouseenter mouseleave ' +
	'mouseup keydown keyup resize scroll unload'
)
	.split(' ')
	.map((n) => 'on' + n);
for (let a of eventAttributes) GlobalAttrs[a] = null;

export class Schema {
	tags: Record<string, TagSpec>;
	globalAttrs: Record<string, null | readonly string[]>;
	allTags: readonly string[];
	globalAttrNames: readonly string[];

	constructor(
		extraTags?: Record<string, TagSpec>,
		extraAttrs?: Record<string, null | readonly string[]>,
	) {
		this.tags = { ...Tags, ...extraTags };
		this.globalAttrs = { ...GlobalAttrs, ...extraAttrs };
		this.allTags = Object.keys(this.tags);
		this.globalAttrNames = Object.keys(this.globalAttrs);
	}

	static default = new Schema();
}

export function elementName(doc: Text, tree: SyntaxNode | null | undefined, max = doc.length) {
	if (!tree) return '';
	let tag = tree.firstChild;
	let name = tag && tag.getChild('TagName');
	return name ? doc.sliceString(name.from, Math.min(name.to, max)) : '';
}

function findParentElement(tree: SyntaxNode, skip = false) {
	for (let cur = tree.parent; cur; cur = cur.parent)
		if (cur.name == 'Element') {
			if (skip) skip = false;
			else return cur;
		}
	return null;
}

function allowedChildren(doc: Text, tree: SyntaxNode, schema: Schema) {
	let parentInfo = schema.tags[elementName(doc, findParentElement(tree, true))];
	return parentInfo?.children || schema.allTags;
}

function openTags(doc: Text, tree: SyntaxNode) {
	let open = [];
	for (let parent: SyntaxNode | null = tree; (parent = findParentElement(parent)); ) {
		let tagName = elementName(doc, parent);
		if (tagName && parent.lastChild!.name == 'CloseTag') break;
		if (
			tagName &&
			open.indexOf(tagName) < 0 &&
			(tree.name == 'EndTag' || tree.from >= parent.firstChild!.to)
		)
			open.push(tagName);
	}
	return open;
}

const identifier = /^[:\-\.\w\u00b7-\uffff]*$/;

function completeTag(
	state: EditorState,
	schema: Schema,
	tree: SyntaxNode,
	from: number,
	to: number,
) {
	let end = /\s*>/.test(state.sliceDoc(to, to + 5)) ? '' : '>';
	return {
		from,
		to,
		options: allowedChildren(state.doc, tree, schema)
			.map((tagName) => ({ label: tagName, type: 'type' }))
			.concat(
				openTags(state.doc, tree).map((tag, i) => ({
					label: '/' + tag,
					apply: '/' + tag + end,
					type: 'type',
					boost: 99 - i,
				})),
			),
		validFor: /^\/?[:\-\.\w\u00b7-\uffff]*$/,
	};
}

function completeCloseTag(state: EditorState, tree: SyntaxNode, from: number, to: number) {
	let end = /\s*>/.test(state.sliceDoc(to, to + 5)) ? '' : '>';
	return {
		from,
		to,
		options: openTags(state.doc, tree).map((tag, i) => ({
			label: tag,
			apply: tag + end,
			type: 'type',
			boost: 99 - i,
		})),
		validFor: identifier,
	};
}

function completeStartTag(state: EditorState, schema: Schema, tree: SyntaxNode, pos: number) {
	let options = [],
		level = 0;
	for (let tagName of allowedChildren(state.doc, tree, schema))
		options.push({ label: '<' + tagName, type: 'type' });
	for (let open of openTags(state.doc, tree))
		options.push({ label: '</' + open + '>', type: 'type', boost: 99 - level++ });
	return { from: pos, to: pos, options, validFor: /^<\/?[:\-\.\w\u00b7-\uffff]*$/ };
}

function completeAttrName(
	state: EditorState,
	schema: Schema,
	tree: SyntaxNode,
	from: number,
	to: number,
) {
	let elt = findParentElement(tree),
		info = elt ? schema.tags[elementName(state.doc, elt)] : null;
	let localAttrs = info && info.attrs ? Object.keys(info.attrs) : [];
	let names =
		info && info.globalAttrs === false
			? localAttrs
			: localAttrs.length
				? localAttrs.concat(schema.globalAttrNames)
				: schema.globalAttrNames;
	return {
		from,
		to,
		options: names.map((attrName) => ({ label: attrName, type: 'property' })),
		validFor: identifier,
	};
}

function completeAttrValue(
	state: EditorState,
	schema: Schema,
	tree: SyntaxNode,
	from: number,
	to: number,
) {
	let nameNode = tree.parent?.getChild('AttributeName');
	let options = [],
		token = undefined;
	if (nameNode) {
		let attrName = state.sliceDoc(nameNode.from, nameNode.to);
		let attrs: readonly string[] | null | undefined = schema.globalAttrs[attrName];
		if (!attrs) {
			let elt = findParentElement(tree),
				info = elt ? schema.tags[elementName(state.doc, elt)] : null;
			attrs = info?.attrs && info.attrs[attrName];
		}
		if (attrs) {
			let base = state.sliceDoc(from, to).toLowerCase(),
				quoteStart = '"',
				quoteEnd = '"';
			if (/^['"]/.test(base)) {
				token = base[0] == '"' ? /^[^"]*$/ : /^[^']*$/;
				quoteStart = '';
				quoteEnd = state.sliceDoc(to, to + 1) == base[0] ? '' : base[0];
				base = base.slice(1);
				from++;
			} else {
				token = /^[^\s<>='"]*$/;
			}
			for (let value of attrs)
				options.push({ label: value, apply: quoteStart + value + quoteEnd, type: 'constant' });
		}
	}
	return { from, to, options, validFor: token };
}

function htmlCompletionFor(schema: Schema, context: CompletionContext): CompletionResult | null {
	let { state, pos } = context,
		around = syntaxTree(state).resolveInner(pos),
		tree = around.resolve(pos, -1);
	for (let scan = pos, before; around == tree && (before = tree.childBefore(scan)); ) {
		let last = before.lastChild;
		if (!last || !last.type.isError || last.from < last.to) break;
		around = tree = before;
		scan = last.from;
	}
	if (tree.name == 'TagName') {
		return tree.parent && /CloseTag$/.test(tree.parent.name)
			? completeCloseTag(state, tree, tree.from, pos)
			: completeTag(state, schema, tree, tree.from, pos);
	} else if (tree.name == 'StartTag') {
		return completeTag(state, schema, tree, pos, pos);
	} else if (tree.name == 'StartCloseTag' || tree.name == 'IncompleteCloseTag') {
		return completeCloseTag(state, tree, pos, pos);
	} else if (
		(context.explicit && (tree.name == 'OpenTag' || tree.name == 'SelfClosingTag')) ||
		tree.name == 'AttributeName'
	) {
		return completeAttrName(
			state,
			schema,
			tree,
			tree.name == 'AttributeName' ? tree.from : pos,
			pos,
		);
	} else if (
		tree.name == 'Is' ||
		tree.name == 'AttributeValue' ||
		tree.name == 'UnquotedAttributeValue'
	) {
		return completeAttrValue(state, schema, tree, tree.name == 'Is' ? pos : tree.from, pos);
	} else if (
		context.explicit &&
		(around.name == 'Element' || around.name == 'Text' || around.name == 'Document')
	) {
		return completeStartTag(state, schema, tree, pos);
	} else {
		return null;
	}
}

/// HTML tag completion. Opens and closes tags and attributes in a
/// context-aware way.
export function htmlCompletionSource(context: CompletionContext) {
	return htmlCompletionFor(Schema.default, context);
}

/// Create a completion source for HTML extended with additional tags
/// or attributes.
export function htmlCompletionSourceWith(config: {
	/// Define extra tag names to complete.
	extraTags?: Record<string, TagSpec>;
	/// Add global attributes that are available on all tags.
	extraGlobalAttributes?: Record<string, null | readonly string[]>;
}) {
	let { extraTags, extraGlobalAttributes: extraAttrs } = config;
	let schema = extraAttrs || extraTags ? new Schema(extraTags, extraAttrs) : Schema.default;
	return (context: CompletionContext) => htmlCompletionFor(schema, context);
}
