// esbuild configuration for bundling runtime code
// Runtime code runs inside isolated context (isolate/worker/subprocess)
// and must be bundled as a self-contained IIFE or ESM module

const esbuild = require('esbuild');
const path = require('path');

// The guest gets the character map of the `transliteration` package from the
// host, so the map stays out of the runtime bundle.
const guestToAsciiPlugin = {
	name: 'guest-to-ascii',
	setup(build) {
		build.onResolve({ filter: /\/to-ascii$/ }, () => ({
			path: path.join(__dirname, 'src/runtime/to-ascii.ts'),
		}));
		let charmapIsReplaced = false;
		build.onResolve({ filter: /\/data\/charmap$/ }, () => {
			charmapIsReplaced = true;
			return { path: 'charmap', namespace: 'empty-charmap' };
		});
		build.onEnd(() => {
			if (!charmapIsReplaced) {
				throw new Error('The character map of `transliteration` is in the runtime bundle');
			}
		});
		build.onLoad({ filter: /.*/, namespace: 'empty-charmap' }, () => ({
			contents: 'export const charmap = {};',
		}));
	},
};

// These libraries run a long setup when they load, and few expressions use them.
// Each group is bundled apart, and loads at the first call of one of its stand-ins.
const lodashFunctions = ['isEqual', 'random', 'uniqWith'];

const lazyGroups = {
	md5: "module.exports = require('md5');",
	// Only jssha has an ES module build. An import resolves to it, and it is smaller than the UMD build.
	jssha: "import SHA from 'jssha'; module.exports = SHA;",
	jmespath: "module.exports = require('jmespath');",
	lodash: `module.exports = { ${lodashFunctions.map((name) => `${name}: require('lodash/${name}')`).join(', ')} };`,
};

const standIn = (group, body) => `import { library } from 'lazy-group:${group}';\n${body}`;

const lodashStandIn = (name) =>
	standIn('lodash', `export default function (...args) { return library().${name}(...args); }`);

// Each stand-in has the exports that the runtime uses.
const lazyLibraries = {
	md5: standIn('md5', 'export default function (...args) { return library()(...args); }'),
	jssha: standIn(
		'jssha',
		'export default function SHA(...args) { return new (library())(...args); }',
	),
	jmespath: standIn(
		'jmespath',
		'export function search(...args) { return library().search(...args); }',
	),
	...Object.fromEntries(lodashFunctions.map((name) => [`lodash/${name}`, lodashStandIn(name)])),
};

/**
 * Returns the source of a module whose `library()` loads the group at its first call.
 * A load that does not complete keeps nothing, so the next call loads the group again.
 */
const lazyGroupSource = async (build, group) => {
	const { minify, target, platform, mainFields } = build.initialOptions;
	const { outputFiles } = await build.esbuild.build({
		stdin: { contents: lazyGroups[group], resolveDir: __dirname },
		bundle: true,
		write: false,
		format: 'cjs',
		minify,
		target,
		platform,
		mainFields,
	});
	return `
function load() {
	const module = { exports: {} };
	(function (module, exports) {
${outputFiles[0].text}
	})(module, module.exports);
	return module.exports;
}
let loaded;
export const library = () => (loaded ??= load());
`;
};

const lazyLibrariesPlugin = {
	name: 'lazy-libraries',
	setup(build) {
		const standInsInBundle = new Set();
		const filter = new RegExp(`^(?:${Object.keys(lazyLibraries).join('|')})$`);
		build.onResolve({ filter }, (args) => {
			standInsInBundle.add(args.path);
			return { path: args.path, namespace: 'lazy-library' };
		});
		build.onLoad({ filter: /.*/, namespace: 'lazy-library' }, (args) => ({
			contents: lazyLibraries[args.path],
		}));
		build.onResolve({ filter: /^lazy-group:/ }, (args) => ({
			path: args.path.slice('lazy-group:'.length),
			namespace: 'lazy-group',
		}));
		build.onLoad({ filter: /.*/, namespace: 'lazy-group' }, async (args) => ({
			contents: await lazyGroupSource(build, args.path),
		}));
		build.onEnd(() => {
			const unused = Object.keys(lazyLibraries).filter((name) => !standInsInBundle.has(name));
			if (unused.length > 0) {
				throw new Error(`The runtime bundle does not import these lazy libraries: ${unused}`);
			}
		});
	},
};

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
		plugins: [guestToAsciiPlugin, lazyLibrariesPlugin],
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
