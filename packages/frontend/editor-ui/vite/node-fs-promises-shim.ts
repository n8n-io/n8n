/**
 * Browser shim for node:fs/promises.
 *
 * QuickJsBridge imports readFile from node:fs/promises, but in the browser
 * it always uses the runtimeBundle config and never calls readFile.
 * This shim satisfies the import without pulling in Node.js-only code.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function readFile(_path: string, _encoding?: string): Promise<string | Buffer> {
	throw new Error('node:fs/promises is not available in browser environments');
}
