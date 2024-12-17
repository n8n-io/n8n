/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config'),
	setupFilesAfterEnv: ['n8n-workflow/test/setup.ts'],
	testTimeout: 10_000,
};
