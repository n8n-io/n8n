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

export function writeBlockedMessage(filename: string) {
	return `Request to write file "${filename}" to object storage was blocked because S3 storage is not available with your current license. Please upgrade to a license that supports this feature, or set N8N_DEFAULT_BINARY_DATA_MODE to an option other than "s3".`;
}
