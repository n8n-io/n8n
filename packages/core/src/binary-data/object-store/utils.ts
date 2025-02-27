import { Stream } from 'node:stream';
import { parseStringPromise } from 'xml2js';
import { firstCharLowerCase, parseBooleans, parseNumbers } from 'xml2js/lib/processors';

export function isStream(maybeStream: unknown): maybeStream is Stream {
	return maybeStream instanceof Stream;
}

export async function parseXml<T>(xml: string): Promise<T> {
	return await (parseStringPromise(xml, {
		explicitArray: false,
		ignoreAttrs: true,
		tagNameProcessors: [firstCharLowerCase],
		valueProcessors: [parseNumbers, parseBooleans],
	}) as Promise<T>);
}
