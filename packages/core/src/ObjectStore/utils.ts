import { Stream } from 'node:stream';

export function isStream(maybeStream: unknown): maybeStream is Stream {
	return maybeStream instanceof Stream;
}

// @TODO: Add more info to errors

export class DownloadTypeError extends TypeError {
	constructor(expectedType: 'stream' | 'buffer', actualType: string) {
		super(`Expected ${expectedType} but received ${actualType} from external storage download.`);
	}
}

export class RequestToObjectStorageFailed extends Error {
	constructor() {
		super('Request to external object storage failed');
	}
}
