import { jsonParse } from 'n8n-workflow';
import { OperationalError } from '@n8n/errors';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** Integration name that Weaviate telemetry reports for n8n traffic. */
const INTEGRATION_NAME = 'n8n-langchain';

/** Weaviate reads this header on both the HTTP and the gRPC transport. */
export const INTEGRATION_HEADER = 'X-Weaviate-Client-Integration';

/** Errors that mean "nothing here", so the walk continues upwards. */
const MISSING_PATH_CODES = new Set(['ENOENT', 'ENOTDIR']);

/**
 * Filesystem errors worth a retry. Other failures, such as a malformed
 * `package.json`, do not change while the process runs, so they stay cached.
 */
const TRANSIENT_FS_CODES = new Set(['EMFILE', 'ENFILE', 'EAGAIN', 'EBUSY', 'EIO']);

const errorCode = (error: unknown) =>
	error instanceof Error && 'code' in error && typeof error.code === 'string'
		? error.code
		: undefined;

/**
 * Finds the version in the nearest `package.json` above `startDir`.
 *
 * The walk works for both the compiled (`dist/nodes/...`) and the source
 * (`nodes/...`) layout. A JSON import is not possible, because the build sets
 * `resolveJsonModule: false`. Only a missing path continues the walk, so a
 * broken `package.json` never resolves the version of a package further up.
 */
export async function resolvePackageVersion(startDir: string): Promise<string> {
	let dir = startDir;
	while (true) {
		try {
			const { version } = jsonParse<{ version?: string }>(
				await readFile(join(dir, 'package.json'), 'utf8'),
			);
			if (version) return version;
		} catch (error) {
			const code = errorCode(error);
			if (code === undefined || !MISSING_PATH_CODES.has(code)) throw error;
		}
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new OperationalError('Could not resolve the n8n-nodes-langchain package version');
}

let cachedVersion: Promise<string> | undefined;

/**
 * The version of `@n8n/n8n-nodes-langchain`, read one time for each process.
 *
 * The cache holds the promise, so concurrent first calls share one read. Only
 * a transient filesystem error clears the cache, so that a later call can retry.
 */
export async function getIntegrationVersion(): Promise<string> {
	cachedVersion ??= resolvePackageVersion(__dirname);
	const pending = cachedVersion;
	try {
		return await pending;
	} catch (error) {
		const code = errorCode(error);
		// Keep a retry that another caller started already
		if (code && TRANSIENT_FS_CODES.has(code) && cachedVersion === pending) {
			cachedVersion = undefined;
		}
		throw error;
	}
}

/**
 * Gives the integration header for a new Weaviate client. Never throws.
 *
 * Pass the result as the `headers` connect option. The client then sends the
 * header with each HTTP and gRPC request, also with the startup checks.
 */
export async function getIntegrationHeaders(): Promise<Record<string, string>> {
	try {
		return { [INTEGRATION_HEADER]: `${INTEGRATION_NAME}/${await getIntegrationVersion()}` };
	} catch {
		// Telemetry is best effort, so an error here must not stop the node
		return {};
	}
}
