// WebCrypto Polyfill for older versions of Node.js 18
if (!globalThis.crypto?.getRandomValues) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
	globalThis.crypto = require('node:crypto').webcrypto;
}
