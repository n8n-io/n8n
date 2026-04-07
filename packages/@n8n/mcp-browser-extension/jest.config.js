/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config'),
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				isolatedModules: true,
				tsconfig: {
					module: 'commonjs',
					moduleResolution: 'node',
					target: 'ES2022',
					lib: ['ES2022', 'DOM'],
					types: ['jest', 'chrome'],
					esModuleInterop: true,
					declaration: false,
					sourceMap: true,
					skipLibCheck: true,
				},
			},
		],
	},
	collectCoverageFrom: ['src/**/*.ts'],
};
