/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config'),
	transform: {
		'^.+\\.ts$': ['ts-jest', { isolatedModules: false }],
	},
};
