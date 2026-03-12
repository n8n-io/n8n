/** @type {import('jest').Config} */
const base = require('../../../jest.config');

module.exports = {
	...base,
	testPathIgnorePatterns: [...(base.testPathIgnorePatterns || []), '/integration/'],
};
