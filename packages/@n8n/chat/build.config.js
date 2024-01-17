import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
	entries: [
		{
			builder: 'mkdist',
			format: 'esm',
			input: './src',
			outDir: './tmp/lib',
		},
		{
			builder: 'mkdist',
			format: 'cjs',
			input: './src',
			outDir: './tmp/cjs',
		},
	],
	clean: true,
	declaration: true,
	failOnWarn: false,
});
