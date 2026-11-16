import { Time } from '@n8n/constants';
import type { Response } from 'express';
import { basename, dirname } from 'path';

const IMMUTABLE_CACHE_CONTROL = `public, max-age=${365 * Time.days.toSeconds}, immutable`;

/** Matches the `<name>-<8-character hash>.wasm` file names that the editor build writes. */
const HASHED_WASM_FILE_NAME = /-[\w-]{8}\.wasm$/;

/**
 * Tells if the file is a build asset whose name changes when its content changes.
 * Only `.wasm` files qualify: n8n rewrites the `.js` and `.css` files at startup
 * with instance config, so their content can change under the same name.
 */
export function isImmutableAsset(filePath: string): boolean {
	return basename(dirname(filePath)) === 'assets' && HASHED_WASM_FILE_NAME.test(filePath);
}

/**
 * Sets a long-lived immutable `Cache-Control` on immutable assets.
 * Other files keep the `Cache-Control` that `express.static` derives from `maxAge`.
 */
export function setImmutableAssetHeaders(res: Response, filePath: string) {
	if (isImmutableAsset(filePath)) {
		res.setHeader('Cache-Control', IMMUTABLE_CACHE_CONTROL);
	}
}
