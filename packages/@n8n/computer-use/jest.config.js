/** @type {import('jest').Config} */
const base = require('../../../jest.config');

module.exports = {
	...base,
	moduleNameMapper: {
		...base.moduleNameMapper,
		// @inquirer/prompts and all its sub-packages are ESM-only.
		// Tests that don't need interactive prompts can use this mock.
		'^@inquirer/(.*)$': '<rootDir>/src/__mocks__/@inquirer/prompts.ts',
	},
};
