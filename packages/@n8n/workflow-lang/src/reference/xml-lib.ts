/**
 * `XML.parse`, `XML.snippet` and `XML.content` (spec section 4.3) with the
 * libraries that n8n's RSS Feed Read node uses: xml2js 0.5 and the helpers
 * of rss-parser 3.13. The bytecode VM and the reference runner use them; the
 * runtime has its own parser (`workflow-runtime/src/core/xml.zig`).
 *
 * The libraries load from the n8n node package, so this package needs no new
 * dependencies.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const nodesBase = join(
	dirname(fileURLToPath(import.meta.url)),
	'../../../../nodes-base/package.json',
);

interface Libraries {
	parseXml(text: string): unknown;
	getSnippet(html: string): string;
	getContent(element: unknown): unknown;
}

let libraries: Libraries | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** The libraries; untyped CommonJS, so the shapes are checked here. */
function load(): Libraries {
	if (libraries) return libraries;
	const fromRss = createRequire(createRequire(nodesBase).resolve('rss-parser'));
	const xml2js: unknown = fromRss('xml2js');
	const utils: unknown = fromRss('./lib/utils.js');
	const Parser: unknown = isRecord(xml2js) ? xml2js.Parser : undefined;
	if (typeof Parser !== 'function' || !isRecord(utils))
		throw new Error('xml2js or rss-parser did not load');
	const getSnippet = utils.getSnippet;
	const getContent = utils.getContent;
	if (typeof getSnippet !== 'function' || typeof getContent !== 'function') {
		throw new Error('rss-parser utils did not load');
	}
	const sanitize = (name: string) =>
		['__proto__', 'constructor', 'prototype'].includes(name) ? `sanitized_${name}` : name;
	libraries = {
		parseXml(text) {
			const parser: unknown = Reflect.construct(Parser, [
				{ tagNameProcessors: [sanitize], attrNameProcessors: [sanitize] },
			]);
			let out: { error?: unknown; result?: unknown } = {};
			const parseString: unknown = isRecord(parser) ? parser.parseString : undefined;
			if (typeof parseString !== 'function') throw new Error('xml2js has no parseString');
			// The callback runs before parseString returns, for a string input.
			Reflect.apply(parseString, parser, [
				text,
				(error: unknown, result: unknown) => {
					out = { error, result };
				},
			]);
			if (out.error) {
				const e = out.error instanceof Error ? out.error : new Error('XML parse failed');
				// oxlint-disable-next-line typescript/only-throw-error -- workflow errors are plain { name, message } objects.
				throw { name: 'Error', message: e.message };
			}
			// xml2js objects have no prototype; a structured clone gives plain ones.
			return out.result === null || out.result === undefined ? null : structuredClone(out.result);
		},
		getSnippet: (html) => String(Reflect.apply(getSnippet, utils, [html])),
		getContent: (element) => Reflect.apply(getContent, utils, [element]),
	};
	return libraries;
}

export function xmlParse(text: unknown): unknown {
	return load().parseXml(String(text));
}

export function xmlSnippet(html: unknown): string {
	return load().getSnippet(String(html));
}

export function xmlContent(element: unknown): unknown {
	return load().getContent(element);
}
