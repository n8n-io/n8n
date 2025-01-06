import 'reflect-metadata';

// WebCrypto Polyfill for older versions of Node.js 18
if (!globalThis.crypto?.getRandomValues) {
	globalThis.crypto = require('node:crypto').webcrypto;
}
