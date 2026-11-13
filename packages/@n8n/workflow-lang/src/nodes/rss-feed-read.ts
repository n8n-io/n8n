/**
 * Compiled library node: a hand port of `n8n-nodes-base.rssFeedRead`
 * version 1.2 (rss-parser 3.13 on xml2js 0.5).
 *
 * The feed is read with `ctx.http` and parsed with the native `XML.parse`;
 * the item fields, snippets and contents follow rss-parser's `buildRSS`,
 * `parseItemRss`, `parseItemAtom` and `decorateItunes`. `ignoreSSL` runs the
 * v1 node in the fallback host. Versions 1 and 1.1 (another Accept header,
 * and version 1 reads the feed once for all items) run in the host too.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface RssOptions {
	customFields?: string;
	ignoreSSL?: boolean;
}

interface RssParameters {
	url?: string;
	options?: RssOptions;
}

type Xml = Record<string, unknown>;
type Field = [string, string, boolean];

const RELAXED_ACCEPT =
	'application/rss+xml, application/rdf+xml;q=0.8, application/atom+xml;q=0.6, application/xml;q=0.4, text/xml;q=0.4';

/** rss-parser `fields.item`: [from, to, includeSnippet]. */
const ITEM_FIELDS: Field[] = [
	['author', 'creator', false],
	['dc:creator', 'creator', false],
	['dc:date', 'date', false],
	['dc:language', 'language', false],
	['dc:rights', 'rights', false],
	['dc:source', 'source', false],
	['dc:title', 'title', false],
	['title', 'title', false],
	['link', 'link', false],
	['pubDate', 'pubDate', false],
	['author', 'author', false],
	['summary', 'summary', false],
	['content:encoded', 'content:encoded', true],
	['enclosure', 'enclosure', false],
	['dc:creator', 'dc:creator', false],
	['dc:date', 'dc:date', false],
	['comments', 'comments', false],
];

const PODCAST_ITEM_FIELDS: Field[] = [
	'author',
	'subtitle',
	'summary',
	'explicit',
	'duration',
	'image',
	'episode',
	'image',
	'season',
	'keywords',
	'episodeType',
].map((f): Field => [`itunes:${f}`, f, false]);

function isXml(value: unknown): value is Xml {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function first(xml: Xml, key: string): unknown {
	const list = xml[key];
	return Array.isArray(list) ? list[0] : undefined;
}

/** rss-parser `copyFromXML`. */
function copyFromXml(xml: Xml, dest: Xml, fields: Field[]): void {
	for (const [from, to, snippet] of fields) {
		if (xml[from] !== undefined) dest[to] = first(xml, from);
		const v = dest[to];
		if (v && isXml(v) && typeof v._ === 'string') dest[to] = v._;
		if (snippet && dest[to] && typeof dest[to] === 'string') {
			dest[`${to}Snippet`] = XML.snippet(String(dest[to]));
		}
	}
}

/** rss-parser `setISODate`: an invalid date leaves no `isoDate`. */
function setIsoDate(item: Xml): void {
	const date = item.pubDate || item.date;
	if (!date || typeof date !== 'string') return;
	const ms = Date.parse(date.trim());
	if (!isNaN(ms)) item.isoDate = new Date(ms).toISOString();
}

/** rss-parser `getLink`. */
function getLink(links: unknown, rel: string, fallback: number): unknown {
	if (!Array.isArray(links)) return undefined;
	for (const link of links) {
		const attrs = isXml(link) ? link.$ : undefined;
		if (!isXml(attrs)) throw new TypeError("Cannot read properties of undefined (reading 'rel')");
		if (attrs.rel === rel) return attrs.href;
	}
	const pick = links[fallback];
	if (isXml(pick) && isXml(pick.$)) return pick.$.href;
	return undefined;
}

function parseItemRss(xmlItem: Xml, fields: Field[]): Xml {
	const item: Xml = {};
	copyFromXml(xmlItem, item, fields);
	const enclosure = first(xmlItem, 'enclosure');
	if (xmlItem.enclosure) item.enclosure = isXml(enclosure) ? enclosure.$ : undefined;
	if (xmlItem.description) {
		item.content = XML.content(first(xmlItem, 'description'));
		item.contentSnippet = XML.snippet(String(item.content));
	}
	if (xmlItem.guid) {
		item.guid = first(xmlItem, 'guid');
		const guid = item.guid;
		if (isXml(guid) && guid._) item.guid = guid._;
	}
	const attrs = xmlItem.$;
	if (isXml(attrs) && attrs['rdf:about']) item['rdf:about'] = attrs['rdf:about'];
	if (xmlItem.category) item.categories = xmlItem.category;
	setIsoDate(item);
	return item;
}

function parseItemAtom(entry: Xml, custom: Field[]): Xml {
	const item: Xml = {};
	copyFromXml(entry, item, custom);
	if (entry.title) {
		let title = first(entry, 'title') || '';
		if (isXml(title) && title._) title = title._;
		if (title) item.title = title;
	}
	if (Array.isArray(entry.link) && entry.link.length > 0)
		item.link = getLink(entry.link, 'alternate', 0);
	const published = first(entry, 'published');
	if (typeof published === 'string' && published.length > 0) item.pubDate = isoOrThrow(published);
	const updated = first(entry, 'updated');
	if (!item.pubDate && typeof updated === 'string' && updated.length > 0)
		item.pubDate = isoOrThrow(updated);
	const author = first(entry, 'author');
	if (isXml(author) && Array.isArray(author.name) && author.name.length > 0)
		item.author = author.name[0];
	if (Array.isArray(entry.content) && entry.content.length > 0) {
		item.content = XML.content(entry.content[0]);
		item.contentSnippet = XML.snippet(String(item.content));
	}
	if (Array.isArray(entry.summary) && entry.summary.length > 0)
		item.summary = XML.content(entry.summary[0]);
	if (entry.id) item.id = first(entry, 'id');
	setIsoDate(item);
	return item;
}

/** `new Date(text).toISOString()`, which throws for an invalid date. */
function isoOrThrow(text: string): string {
	const ms = Date.parse(text);
	if (isNaN(ms)) throw new RangeError('Invalid time value');
	return new Date(ms).toISOString();
}

/** rss-parser `parseString` after the XML: the items of the feed. */
function feedItems(result: unknown, custom: Field[]): Xml[] {
	if (!isXml(result)) throw new Error('Unable to parse XML.');
	const fields = ITEM_FIELDS.concat(custom);
	if (isXml(result.feed)) {
		const entries = result.feed.entry;
		return Array.isArray(entries) ? entries.filter(isXml).map((e) => parseItemAtom(e, custom)) : [];
	}
	const rss = isXml(result.rss) ? result.rss : undefined;
	const attrs = rss && isXml(rss.$) ? rss.$ : undefined;
	const version = attrs && typeof attrs.version === 'string' ? attrs.version : '';
	if (rss && version.startsWith('2')) {
		const channel = first(rss, 'channel');
		if (!isXml(channel)) throw new TypeError("Cannot read properties of undefined (reading '0')");
		const xmlItems = Array.isArray(channel.item) ? channel.item.filter(isXml) : [];
		const items = xmlItems.map((x) => parseItemRss(x, fields));
		if (attrs && attrs['xmlns:itunes']) {
			// decorateItunes: each item gets the podcast fields.
			xmlItems.forEach((x, index) => {
				const itunes: Xml = {};
				copyFromXml(x, itunes, PODCAST_ITEM_FIELDS);
				const image = first(x, 'itunes:image');
				if (isXml(image) && isXml(image.$) && image.$.href) itunes.image = image.$.href;
				items[index].itunes = itunes;
			});
		}
		return items;
	}
	const rdf = result['rdf:RDF'];
	if (isXml(rdf)) {
		const channel = first(rdf, 'channel');
		if (!isXml(channel)) throw new TypeError("Cannot read properties of undefined (reading '0')");
		const xmlItems = Array.isArray(rdf.item) ? rdf.item.filter(isXml) : [];
		return xmlItems.map((x) => parseItemRss(x, fields));
	}
	if (rss && version.includes('0.9')) {
		const channel = first(rss, 'channel');
		if (!isXml(channel)) throw new TypeError("Cannot read properties of undefined (reading '0')");
		const xmlItems = Array.isArray(channel.item) ? channel.item.filter(isXml) : [];
		return xmlItems.map((x) => parseItemRss(x, fields));
	}
	throw new Error('Feed not recognized as RSS 1 or 2.');
}

/** `new URL(url)` accepts it: a scheme, then something. */
function validUrl(url: string): boolean {
	const colon = url.indexOf(':');
	if (colon < 1) return false;
	const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	if (!letters.includes(url.charAt(0))) return false;
	for (let i = 1; i < colon; i++) {
		const c = url.charAt(i);
		if (!letters.includes(c) && !'0123456789+-.'.includes(c)) return false;
	}
	const scheme = url.slice(0, colon).toLowerCase();
	if (['http', 'https', 'ftp', 'ws', 'wss'].includes(scheme)) return url.length > colon + 1;
	return true;
}

/**
 * The message v1 gives for a failed request, from the runtime's message:
 * the descriptions of n8n's `NodeOperationError` for Node.js error codes,
 * and the node's own message for a refused connection.
 */
function networkMessage(error: unknown, url: string): string {
	const message = isXml(error) && typeof error.message === 'string' ? error.message : String(error);
	if (message.startsWith('http: cannot resolve ')) {
		return 'The connection cannot be established, this usually occurs due to an incorrect host (domain) value';
	}
	if (message.includes('Connection refused') || message.includes('connection refused')) {
		return `It was not possible to connect to the URL. Please make sure the URL "${url}" it is valid!`;
	}
	if (message.startsWith('http: the request timed out') || message.includes(' timed out after ')) {
		return "The connection timed out, consider setting the 'Retry on Fail' option in the node settings";
	}
	return message;
}

export default defineNode<RssParameters>({
	type: 'n8n-nodes-base.rssFeedRead',
	version: 1.2,
	supports: {
		operations: { default: ['url', 'options', 'options.customFields', 'options.ignoreSSL=false'] },
	},
	async run(ctx, parameters, items) {
		const out: Item[] = [];
		const options = parameters.options ?? {};
		const custom: Field[] = options.customFields
			? options.customFields.split(',').map((f): Field => [f.trim(), f.trim(), false])
			: [];
		for (const _item of items ?? [{}]) {
			const url = parameters.url ?? '';
			if (!url) throw new Error('The parameter "URL" has to be set!');
			if (!validUrl(url)) throw new Error('The provided "URL" is not valid!');
			let response: { status: number; body: unknown };
			try {
				response = await ctx.http<unknown>({
					method: 'GET',
					url,
					headers: { 'User-Agent': 'rss-parser', Accept: RELAXED_ACCEPT },
					qs: {},
					body: undefined,
				});
			} catch (error) {
				throw new Error(networkMessage(error, url));
			}
			if (response.status >= 400) {
				throw new Error(`Request failed with status code ${response.status}`);
			}
			const body = response.body;
			const text = typeof body === 'string' ? body : JSON.stringify(body);
			for (const item of feedItems(XML.parse(text), custom)) out.push(item);
		}
		return out;
	},
});
