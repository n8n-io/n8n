import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
	input: './src/grammar/index.js',
	output: [
		{
			format: 'cjs',
			file: './src/grammar/dist/index.cjs',
		},
		{
			format: 'es',
			file: './src/grammar/dist/index.es.js',
		},
	],
	external(id) {
		return !/^[\.\/]/.test(id);
	},
	plugins: [nodeResolve()],
};
