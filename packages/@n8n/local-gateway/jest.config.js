const baseConfig = require('../../../jest.config');

/** @type {import('jest').Config} */
module.exports = {
	...baseConfig,
	transform: {
		...baseConfig.transform,
		'^.+\\.ts$': [
			'ts-jest',
			{
				isolatedModules: true,
				tsconfig: {
					module: 'CommonJS',
					moduleResolution: 'node',
				},
			},
		],
	},
};
