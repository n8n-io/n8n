import { UnexpectedError } from '@n8n/errors';

let n8nVersion: string | undefined;

/** Sets the version of the running n8n instance. The `n8n` package calls this when it loads. */
export function setN8nVersion(version: string) {
	n8nVersion = version;
}

/** Returns the version of the running n8n instance. */
export function getN8nVersion(): string {
	if (n8nVersion === undefined) {
		throw new UnexpectedError('Cannot get the n8n version because it is not set');
	}

	return n8nVersion;
}
