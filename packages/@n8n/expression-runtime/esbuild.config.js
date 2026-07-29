// esbuild configuration for bundling runtime code
// Runtime code runs inside isolated context (isolate/worker/subprocess)
// and must be bundled as a self-contained IIFE or ESM module

const esbuild = require('esbuild');
const path = require('path');

async function build() {
	const sharedOptions = {
		entryPoints: [path.join(__dirname, 'src/runtime/index.ts')],
		bundle: true,
		minify: true,
		sourcemap: true,
		target: 'es2020',
		platform: 'neutral', // Works in both Node.js and browser
		mainFields: ['module', 'main'], // Needed for neutral platform to resolve packages
		external: [], // Bundle everything (lodash, luxon)
	};

	// IIFE bundle for isolated-vm
	await esbuild.build({
		...sharedOptions,
		format: 'iife',
		globalName: '__n8nRuntime',
		outfile: path.join(__dirname, 'dist/bundle/runtime.iife.js'),
	});

	// ESM bundle for Web Workers
	await esbuild.build({
		...sharedOptions,
		format: 'esm',
		outfile: path.join(__dirname, 'dist/bundle/runtime.esm.js'),
	});

	console.log('✅ Runtime bundles created successfully');
}

build().catch((error) => {
	console.error('❌ Build failed:', error);
	process.exit(1);
});
