import { Stream } from 'node:stream';
import { parseStringPromise } from 'xml2js';
import { firstCharLowerCase, parseBooleans, parseNumbers } from 'xml2js/lib/processors';

export function isStream(maybeStream: unknown): maybeStream is Stream {
	return maybeStream instanceof Stream;
}

export async function parseXml<T>(xml: string): Promise<T> {
	return parseStringPromise(xml, {
		explicitArray: false,
		ignoreAttrs: true,
		tagNameProcessors: [firstCharLowerCase],
		valueProcessors: [parseNumbers, parseBooleans],
	}) as Promise<T>;
}

export function writeBlockedMessage(filename: string) {
	return `BLOCKED: Request to write file "${filename}" to object storage failed. This request was blocked because your current binary data mode is "s3" but storing binary data in S3 is not available with your current license. Please upgrade to a license that supports this feature, or set N8N_DEFAULT_BINARY_DATA_MODE to an option other than "s3".`;
}
