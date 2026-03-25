/**
 * Internal webcrypto alias.
 * We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
 * See utils.ts for details.
 * @module
 */
declare const globalThis: Record<string, any> | undefined;
export const crypto: any =
  typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;
