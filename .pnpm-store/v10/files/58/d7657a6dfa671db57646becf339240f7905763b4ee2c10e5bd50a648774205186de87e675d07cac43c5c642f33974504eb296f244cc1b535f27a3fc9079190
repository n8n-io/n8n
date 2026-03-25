/**
 * Internal webcrypto alias.
 * We prefer WebCrypto aka globalThis.crypto, which exists in node.js 16+.
 * Falls back to Node.js built-in crypto for Node.js <=v14.
 * See utils.ts for details.
 * @module
 */
// @ts-ignore
import * as nc from 'node:crypto';
export const crypto: any =
  nc && typeof nc === 'object' && 'webcrypto' in nc
    ? (nc.webcrypto as any)
    : nc && typeof nc === 'object' && 'randomBytes' in nc
      ? nc
      : undefined;
