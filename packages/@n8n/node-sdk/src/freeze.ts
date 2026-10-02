import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { toContract, type Action, type Trigger } from './define';
import { evaluateBundle, toNodeType } from './runtime';
import { triggerDescriptionOf } from './triggers';
import {
	ACTION_API_VERSION,
	actionApiVersionOf,
	contractHash,
	sha256,
	type VersionManifest,
} from './version';

/** The SDK source inlines into each bundle, so a version keeps the SDK helpers it was frozen with. */
const SDK_SOURCE = path.resolve(__dirname, '..', 'src');

/** A frozen action or trigger in memory: its manifest, its bundle, and what the bundle exports. */
export interface FrozenAction {
	readonly manifest: VersionManifest;
	readonly bundle: string;
	readonly action: Action | Trigger;
}

/**
 * Bundles one exported action or trigger with its helpers and dependencies. The same source gives the
 * same bytes, so a release build reproduces the HEAD bundle the registry holds.
 */
export async function freezeAction(entryFile: string, exportName: string): Promise<FrozenAction> {
	const { build } = await import('esbuild');
	const result = await build({
		stdin: {
			contents: `export { ${exportName} as default } from ${JSON.stringify(entryFile)};`,
			resolveDir: path.dirname(entryFile),
			loader: 'ts',
		},
		bundle: true,
		write: false,
		format: 'cjs',
		platform: 'neutral',
		target: 'es2022',
		charset: 'utf8',
		// Comments and layout stay out of the bytes, so only code changes need a new version.
		minifyWhitespace: true,
		// The host provides `n8n-workflow`. Unused SDK modules drop out with their imports.
		external: ['n8n-workflow', 'node:*'],
		plugins: [
			{
				name: 'node-sdk-source',
				setup(bundler) {
					bundler.onResolve({ filter: /^@n8n\/node-sdk$/ }, () => ({
						path: path.join(SDK_SOURCE, 'index.ts'),
						sideEffects: false,
					}));
					bundler.onResolve({ filter: /^\.\/[\w-]+$/ }, ({ importer, path: file }) =>
						importer.startsWith(SDK_SOURCE)
							? { path: path.join(SDK_SOURCE, `${file}.ts`), sideEffects: false }
							: undefined,
					);
				},
			},
		],
	});
	const bundle = result.outputFiles[0]?.text ?? '';
	const action = evaluateBundle(bundle, ACTION_API_VERSION);
	const contract = toContract(action);
	const manifest: VersionManifest = {
		id: action.id,
		semver: action.semver,
		apiVersion: actionApiVersionOf(contract, 'list' in action && action.list !== undefined),
		contractHash: contractHash(contract),
		bundleHash: sha256(bundle),
		contract,
		description:
			'kind' in action ? triggerDescriptionOf(action) : new (toNodeType(action))().description,
	};
	return { manifest, bundle, action };
}

/** Writes `<dir>/<id>/manifest.json` and `bundle.cjs`: the bundled HEAD a package ships. */
export async function writeFrozenAction(dir: string, { manifest, bundle }: FrozenAction) {
	const target = path.join(dir, manifest.id);
	await mkdir(target, { recursive: true });
	await writeFile(path.join(target, 'bundle.cjs'), bundle);
	await writeFile(path.join(target, 'manifest.json'), `${JSON.stringify(manifest, null, '\t')}\n`);
}
