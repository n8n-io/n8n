/** @type {import('jest').Config} */
const baseConfig = require('../../../jest.config');

module.exports = {
	...baseConfig,
	// Watchman is not available in some sandboxed environments (and is optional for Jest).
	watchman: false,
};
