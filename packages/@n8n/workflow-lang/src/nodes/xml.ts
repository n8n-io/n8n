/**
 * Compiled library node: a hand port of `n8n-nodes-base.xml` version 1, mode `jsonToxml`.
 * The v1 node gives each item's JSON to the `Builder` of `xml2js` and keeps the text as
 * `{ [dataPropertyName]: text }`. The text is built here directly, with the rules that the
 * differential test (`__tests__/xml-v1.test.ts`) proves byte-equal to the v1 node:
 *
 * - The root element is the only key of the item's JSON when the item has one key and the
 *   root name is `root`, else the root name.
 * - Two spaces for each level, a line break after each element, `<a/>` for an element with no
 *   text and no children, and one line for an element whose only child is text.
 * - `&`, `<` and `>` are escaped in text, and `\r` becomes `&#xD;`. In attribute values `&`,
 *   `<`, `"`, `\t`, `\n` and `\r` are escaped.
 * - An object under the attribute key gives the attributes of its parent, and a value under
 *   the character key gives its text.
 * - A list gives one element for each member: strings give text, objects give their keys.
 * - `null`, an empty string and an empty object give `<a/>`.
 * - Numbers and booleans give their JavaScript text.
 * - `cdata` wraps text with `&`, `<` or `>` in CDATA, and `headless` drops the declaration.
 *
 * What has no exact form ends with the mark `RUNS_IN_HOST`: the workflow then runs the v1 node
 * in the fallback host, in the same run. That is: a key or an attribute name that is not an
 * XML name, a character that XML 1.0 does not allow, and a value that this port does not read
 * (an attribute value that is not a string, a number or a boolean).
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface XmlOptions {
	attrkey?: unknown;
	charkey?: unknown;
	cdata?: unknown;
	headless?: unknown;
	rootName?: unknown;
	allowSurrogateChars?: unknown;
}

interface XmlParameters {
	/** `jsonToxml` (the converter writes the mode of the v1 node as an operation). */
	operation?: string;
	dataPropertyName?: unknown;
	options?: XmlOptions;
}

type Json = Record<string, unknown>;

/** `RUNS_IN_HOST` of the converter: the workflow runs the host form of the node in the same run. */
const RUNS_IN_HOST = '(no request to repeat: the fallback host runs the node)';

function inHost(reason: string): Error {
	return new Error(`XML: ${reason}. ${RUNS_IN_HOST}`);
}

interface TextChild {
	kind: 'text';
	/** `true` for the content of a CDATA section, which the writer does not escape. */
	raw: boolean;
	value: string;
}

interface ElementNode {
	kind: 'element';
	name: string;
	attrs: Array<[string, string]>;
	children: Array<TextChild | ElementNode>;
	parent: ElementNode | null;
}

/** The options of the v1 `Builder` that this node reads. */
interface Settings {
	attrkey: string;
	charkey: string;
	rootName: string;
	headless: boolean;
	cdata: boolean;
}

/**
 * The first code unit that XML 1.0 does not allow, or -1. The list is the one of the writer
 * of the v1 node: the control characters other than tab, line feed and carriage return, the
 * two noncharacters U+FFFE and U+FFFF, and an unpaired surrogate.
 */
function illegalCharIndex(text: string): number {
	for (let i = 0; i < text.length; i++) {
		const c = text.charCodeAt(i);
		if (c <= 0x08 || c === 0x0b || c === 0x0c || (c >= 0x0e && c <= 0x1f)) return i;
		if (c === 0xfffe || c === 0xffff) return i;
		if (c >= 0xd800 && c <= 0xdbff) {
			const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
			if (next < 0xdc00 || next > 0xdfff) return i;
		} else if (c >= 0xdc00 && c <= 0xdfff) {
			const before = i > 0 ? text.charCodeAt(i - 1) : 0;
			if (before < 0xd800 || before > 0xdbff) return i;
		}
	}
	return -1;
}

/** The name characters of XML 1.0 that start a name. */
function isNameStart(c: number): boolean {
	return (
		c === 0x3a ||
		c === 0x5f ||
		(c >= 0x41 && c <= 0x5a) ||
		(c >= 0x61 && c <= 0x7a) ||
		(c >= 0xc0 && c <= 0xd6) ||
		(c >= 0xd8 && c <= 0xf6) ||
		(c >= 0xf8 && c <= 0x2ff) ||
		(c >= 0x370 && c <= 0x37d) ||
		(c >= 0x37f && c <= 0x1fff) ||
		c === 0x200c ||
		c === 0x200d ||
		(c >= 0x2070 && c <= 0x218f) ||
		(c >= 0x2c00 && c <= 0x2fef) ||
		(c >= 0x3001 && c <= 0xd7ff) ||
		(c >= 0xf900 && c <= 0xfdcf) ||
		(c >= 0xfdf0 && c <= 0xfffd)
	);
}

/** The name characters of XML 1.0 after the first. */
function isNameChar(c: number): boolean {
	return (
		isNameStart(c) ||
		c === 0x2d ||
		c === 0x2e ||
		(c >= 0x30 && c <= 0x39) ||
		c === 0xb7 ||
		(c >= 0x300 && c <= 0x36f) ||
		c === 0x203f ||
		c === 0x2040
	);
}

/** True when the text is an XML name that the v1 node writes, else the reason it is not. */
function nameProblem(name: string): string | null {
	if (name === '') return 'the name is empty';
	const illegal = illegalCharIndex(name);
	if (illegal >= 0) return 'the name has a character that XML does not allow';
	let i = 0;
	let first = true;
	while (i < name.length) {
		const c = name.charCodeAt(i);
		if (c >= 0xd800 && c <= 0xdb7f) {
			const next = i + 1 < name.length ? name.charCodeAt(i + 1) : 0;
			if (next < 0xdc00 || next > 0xdfff) return `the name "${name}" is not an XML name`;
			i += 2;
			first = false;
			continue;
		}
		if (c >= 0xd800 && c <= 0xdfff) return `the name "${name}" is not an XML name`;
		if (first ? !isNameStart(c) : !isNameChar(c)) return `the name "${name}" is not an XML name`;
		i += 1;
		first = false;
	}
	return null;
}

/** `textEscape` of the writer of the v1 node. */
function escapeText(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('\r', '&#xD;');
}

/** `attEscape` of the writer of the v1 node. */
function escapeAttr(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('"', '&quot;')
		.replaceAll('\t', '&#x9;')
		.replaceAll('\n', '&#xA;')
		.replaceAll('\r', '&#xD;');
}

/** `requiresCDATA` of the v1 node: text that CDATA must wrap to stay as it is. */
function needsCdata(value: unknown): boolean {
	return (
		typeof value === 'string' && (value.includes('&') || value.includes('>') || value.includes('<'))
	);
}

/** `wrapCDATA` of the v1 node: the first `]]>` ends the section. */
function wrapCdata(value: string): string {
	return `<![CDATA[${value.replace(']]>', ']]]]><![CDATA[>')}]]>`;
}

/** The text of a value as the writer of the v1 node gives it. */
function textOf(value: unknown): string | null {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return null;
}

/** The name of a key of an object, or the reason this port does not read the key. */
function keyProblem(key: string): string | null {
	return nameProblem(key);
}

/** Appends a text child, and stops when the text is not one that XML allows. */
function appendText(element: ElementNode, value: unknown, settings: Settings): void {
	const text = textOf(value);
	if (text === null) throw inHost('a value has no text form');
	if (settings.cdata && needsCdata(value)) {
		element.children.push({ kind: 'text', raw: true, value: wrapCdata(text) });
		return;
	}
	if (illegalCharIndex(text) >= 0)
		throw inHost('a text has a character that XML 1.0 does not allow');
	element.children.push({ kind: 'text', raw: false, value: escapeText(text) });
}

/** Appends an element child with the name, and stops when the name is not an XML name. */
function appendElement(element: ElementNode, name: string): ElementNode {
	const problem = keyProblem(name);
	if (problem !== null) throw inHost(problem);
	if (illegalCharIndex(name) >= 0) throw inHost('a name has a character that XML does not allow');
	const child: ElementNode = { kind: 'element', name, attrs: [], children: [], parent: element };
	element.children.push(child);
	return child;
}

/** The parent of an element, as `up()` of the v1 node gives it. */
function up(element: ElementNode): ElementNode {
	if (element.parent === null) throw inHost('the root element has no parent');
	return element.parent;
}

/** The value of an attribute as the writer of the v1 node gives it. */
function attrValue(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	throw inHost('an attribute value is not a string, a number or a boolean');
}

/** Adds the attributes of the object under the attribute key. */
function appendAttributes(element: ElementNode, value: unknown): void {
	if (typeof value !== 'object' || value === null) return;
	if (Array.isArray(value)) throw inHost('the value of the attribute key is a list');
	for (const [name, given] of Object.entries(value)) {
		if (given === null || given === undefined) continue;
		const problem = keyProblem(name);
		if (problem !== null) throw inHost(problem);
		const text = escapeAttr(attrValue(given));
		if (illegalCharIndex(text) >= 0) {
			throw inHost('an attribute value has a character that XML 1.0 does not allow');
		}
		const found = element.attrs.findIndex(([key]) => key === name);
		if (found >= 0) element.attrs[found] = [name, text];
		else element.attrs.push([name, text]);
	}
}

/**
 * `render` of the v1 node: writes the object into the element, and gives the element where it
 * ends. A list of lists can end the render deeper than the element that the caller named, and
 * the caller then goes up from there.
 */
function render(element: ElementNode, value: unknown, settings: Settings): ElementNode {
	// The v1 node reads a null as an object without keys.
	if (value === null) return element;
	if (Array.isArray(value)) {
		for (const member of value) {
			// The v1 node reads the keys of each member as element names. A number, a boolean and
			// null have no keys, and the indices of a text and of a list are not XML names.
			if (member === null || typeof member === 'number' || typeof member === 'boolean') continue;
			if (typeof member === 'string') {
				// The indices of a text name the elements, and they are not XML names.
				if (member !== '') throw inHost('a list holds a text where the v1 node reads names');
				continue;
			}
			if (Array.isArray(member)) {
				if (member.length > 0) throw inHost('a list holds a list where the v1 node reads names');
				continue;
			}
			if (typeof member !== 'object') throw inHost('a list holds a value without keys');
			for (const [key, entry] of Object.entries(member)) {
				element = up(render(appendElement(element, key), entry, settings));
			}
		}
		return element;
	}
	if (typeof value !== 'object') {
		appendText(element, value, settings);
		return element;
	}
	for (const [key, child] of Object.entries(value)) {
		if (key === settings.attrkey) {
			appendAttributes(element, child);
		} else if (key === settings.charkey) {
			appendText(element, child, settings);
		} else if (Array.isArray(child)) {
			for (const entry of child) {
				if (typeof entry === 'string') {
					const item = appendElement(element, key);
					if (settings.cdata && needsCdata(entry)) {
						item.children.push({ kind: 'text', raw: true, value: wrapCdata(entry) });
					} else {
						if (illegalCharIndex(entry) >= 0) {
							throw inHost('a text has a character that XML 1.0 does not allow');
						}
						item.children.push({ kind: 'text', raw: false, value: escapeText(entry) });
					}
				} else {
					element = up(render(appendElement(element, key), entry, settings));
				}
			}
		} else if (typeof child === 'object') {
			element = up(render(appendElement(element, key), child, settings));
		} else {
			if (typeof child === 'string' && settings.cdata && needsCdata(child)) {
				const item = appendElement(element, key);
				item.children.push({ kind: 'text', raw: true, value: wrapCdata(child) });
			} else {
				appendText(appendElement(element, key), child, settings);
			}
		}
	}
	return element;
}

/** The text of one element and its children, as the writer of the v1 node gives it. */
function writeElement(element: ElementNode, level: number): string {
	const pad = '  '.repeat(level);
	let text = `${pad}<${element.name}`;
	for (const [name, value] of element.attrs) text += ` ${name}="${value}"`;
	const empty =
		element.children.length === 0 ||
		element.children.every((child) => child.kind === 'text' && child.value === '');
	if (empty) return `${text}/>\n`;
	const only = element.children.length === 1 ? element.children[0] : undefined;
	if (only !== undefined && only.kind === 'text') {
		return `${text}>${only.value}</${element.name}>\n`;
	}
	text += '>\n';
	for (const child of element.children) {
		text +=
			child.kind === 'text'
				? `${'  '.repeat(level + 1)}${child.value}\n`
				: writeElement(child, level + 1);
	}
	return `${text}${pad}</${element.name}>\n`;
}

/** The XML text of one item's JSON. */
function buildXml(json: Json, settings: Settings): string {
	const keys = Object.keys(json);
	let rootName = settings.rootName;
	let content: unknown = json;
	if (keys.length === 1 && settings.rootName === 'root') {
		rootName = keys[0];
		content = Object.values(json)[0];
	}
	const problem = nameProblem(rootName);
	if (problem !== null) throw inHost(problem);
	const root: ElementNode = {
		kind: 'element',
		name: rootName,
		attrs: [],
		children: [],
		parent: null,
	};
	render(root, content, settings);
	const declaration = settings.headless
		? ''
		: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
	return `${declaration}${writeElement(root, 0)}`.slice(0, -1);
}

/** The settings of the v1 `Builder` for the options of the node. */
function settingsOf(options: XmlOptions): Settings {
	const text = (given: unknown, name: string, fallback: string): string => {
		if (given === undefined) return fallback;
		if (typeof given !== 'string') throw inHost(`the option "${name}" is not a text`);
		return given;
	};
	const flag = (given: unknown, name: string): boolean => {
		if (given === undefined) return false;
		if (typeof given !== 'boolean') throw inHost(`the option "${name}" is not a boolean`);
		return given;
	};
	// `allowSurrogateChars` changes no text of the writer of the v1 node. The test proves it.
	if (
		options.allowSurrogateChars !== undefined &&
		typeof options.allowSurrogateChars !== 'boolean'
	) {
		throw inHost('the option "allowSurrogateChars" is not a boolean');
	}
	return {
		attrkey: text(options.attrkey, 'attrkey', '$'),
		charkey: text(options.charkey, 'charkey', '_'),
		rootName: text(options.rootName, 'rootName', 'root'),
		headless: flag(options.headless, 'headless'),
		cdata: flag(options.cdata, 'cdata'),
	};
}

export default defineNode<XmlParameters>({
	type: 'n8n-nodes-base.xml',
	version: 1,
	supports: {
		operations: {
			jsonToxml: [
				'dataPropertyName',
				'options',
				'options.attrkey',
				'options.charkey',
				'options.cdata',
				'options.headless',
				'options.rootName',
				'options.allowSurrogateChars',
			],
		},
	},
	async run(_ctx, parameters, items) {
		const out: Item[] = [];
		const operation = parameters.operation ?? '';
		if (operation !== 'jsonToxml') {
			throw inHost(`the operation "${operation}" has no compiled form`);
		}
		const settings = settingsOf(parameters.options ?? {});
		const key = parameters.dataPropertyName;
		if (typeof key !== 'string') throw inHost('the property name is not a text');
		for (const item of items ?? []) {
			const json: Json = {};
			for (const [name, value] of Object.entries(item)) {
				// The runtime keeps a file in `$binary`; the JSON of the v1 item has no such key.
				if (name !== '$binary') json[name] = value;
			}
			out.push({ [key]: buildXml(json, settings) });
		}
		return out;
	},
});
