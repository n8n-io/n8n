import { Stream } from 'node:stream';

export function isStream(maybeStream: unknown): maybeStream is Stream {
	return maybeStream instanceof Stream;
}
