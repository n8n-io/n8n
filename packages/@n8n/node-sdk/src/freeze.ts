import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { UserError } from 'n8n-workflow';

import { toContract } from './define';
import { evaluateBundle, toNodeType } from './runtime';
import {
	contractHash,
	NODE_CONTRACT_ABI,
	parseManifest,
	sha256,
	type VersionManifest,
} from './version';

/** The SDK source inlines into each bundle, so a version keeps the SDK helpers it was frozen with. */
const SDK_SOURCE = path.resolve(__dirname, '..', 'src');

/**
 * Bundles one exported action with its helpers and dependencies into
 * `<outDir>/<id>/<version>/`. The bytes of a frozen version never change: a different bundle
 * needs a new version.
 */
export async function freezeAction(
	entryFile: string,
	exportName: string,
	outDir: string,
): Promise<VersionManifest> {
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
	const code = result.outputFiles[0]?.text ?? '';
	const action = evaluateBundle(code);
	const contract = toContract(action);
	const manifest: VersionManifest = {
		id: action.id,
		version: action.version,
		abi: NODE_CONTRACT_ABI,
		contractHash: contractHash(contract),
		bundleHash: sha256(code),
		contract,
		description: new (toNodeType(action))().description,
	};
	const dir = path.join(outDir, action.id, String(action.version));
	const frozen = await readFile(path.join(dir, 'manifest.json'), 'utf8').then(
		parseManifest,
		() => undefined,
	);
	if (frozen && frozen.bundleHash !== manifest.bundleHash) {
		throw new UserError(
			`${action.id}@${action.version} is already frozen as ${frozen.bundleHash}; bump the version`,
		);
	}
	if (frozen) return frozen;
	await mkdir(dir, { recursive: true });
	await writeFile(path.join(dir, 'bundle.cjs'), code);
	await writeFile(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, '\t')}\n`);
	return manifest;
}
