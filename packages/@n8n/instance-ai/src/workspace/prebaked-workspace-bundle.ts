import type { Logger } from '../logger';
import {
	readWorkspaceFile,
	writeWorkspaceFile,
	writeWorkspaceFileMap,
	type WorkspaceFileTarget,
} from './workspace-files';
import { parseVersionedWorkspaceManifest } from './workspace-manifest';
import { traceSandboxOperation, sandboxFileBytes } from '../tracing/sandbox-tracing';

/**
 * Bundle hash by manifest path, for bundles that one sandbox already has.
 * Keep it as long as the sandbox, so that repeated checks in that sandbox do
 * not read the manifest again.
 */
export type VerifiedWorkspaceBundles = Map<string, string>;

export interface LoadPrebakedWorkspaceBundleOptions<TBundle> {
	workspace: WorkspaceFileTarget;
	verifiedBundles?: VerifiedWorkspaceBundles;
	manifestPath: string;
	expectedHash: string;
	hashField: string;
	schemaVersion: number;
	resourceLabel: string;
	logger: Logger;
	invalidManifestLogMessage: string;
	staleManifestLogMessage: string;
	staleManifestLogKeys: {
		expected: string;
		actual: string;
	};
	successLogMessage: string;
	successLogContext: (bundle: TBundle) => Record<string, unknown>;
	buildBundle: () => Promise<TBundle | undefined> | TBundle | undefined;
}

/**
 * Reuse a workspace bundle when its manifest hash matches the expected value.
 * A matching manifest is trusted without a read of each bundle file: images
 * and snapshots bake the files with the manifest, and a live write puts the
 * manifest last.
 */
export async function loadPrebakedWorkspaceBundle<TBundle extends { files: Map<string, string> }>(
	options: LoadPrebakedWorkspaceBundleOptions<TBundle>,
): Promise<TBundle | undefined> {
	let decision = 'reused';
	let actualHash: string | undefined;
	const { verifiedBundles } = options;
	return await traceSandboxOperation(
		'check-bundle',
		{
			kind: 'batch',
			inputs: { manifestPath: options.manifestPath, expectedHash: options.expectedHash },
			processResult: (bundle) => ({
				outputs: { decision, actualHash, fileCount: bundle?.files.size ?? 0 },
			}),
		},
		async () => {
			if (verifiedBundles?.get(options.manifestPath) === options.expectedHash) {
				decision = 'cached';
				actualHash = options.expectedHash;
				const bundle = await options.buildBundle();
				if (!bundle) decision = 'empty';
				return bundle;
			}

			const manifestRaw = await readWorkspaceFile(options.workspace, options.manifestPath, {
				logger: options.logger,
				resourceLabel: options.resourceLabel,
			});
			if (!manifestRaw) {
				decision = 'missing';
				return undefined;
			}

			const manifest = parseVersionedWorkspaceManifest(manifestRaw, {
				schemaVersion: options.schemaVersion,
				hashField: options.hashField,
			});
			if (!manifest) {
				decision = 'invalid';
				options.logger.debug(options.invalidManifestLogMessage, {
					manifestPath: options.manifestPath,
				});
				return undefined;
			}

			actualHash = manifest.hash;
			if (manifest.hash !== options.expectedHash) {
				decision = 'stale';
				options.logger.debug(options.staleManifestLogMessage, {
					manifestPath: options.manifestPath,
					[options.staleManifestLogKeys.expected]: options.expectedHash,
					[options.staleManifestLogKeys.actual]: manifest.hash,
				});
				return undefined;
			}

			const bundle = await options.buildBundle();
			if (!bundle) {
				decision = 'empty';
				return undefined;
			}

			verifiedBundles?.set(options.manifestPath, options.expectedHash);
			options.logger.debug(options.successLogMessage, options.successLogContext(bundle));
			return bundle;
		},
	);
}

export interface MaterializeWorkspaceBundleOptions<
	TBundle extends { files: Map<string, string>; manifestPath: string },
> {
	workspace: WorkspaceFileTarget;
	verifiedBundles?: VerifiedWorkspaceBundles;
	resourceLabel: string;
	logger: Logger;
	loadPrebaked: () => Promise<TBundle | undefined>;
	buildBundle: () => Promise<TBundle> | TBundle;
	/** Hash that the bundle manifest records. */
	bundleHash: (bundle: TBundle) => string;
	materializedLogMessage: string;
	materializedLogContext: (bundle: TBundle) => Record<string, unknown>;
}

/** Materialize a workspace bundle, skipping writes when a valid prebaked manifest exists. */
export async function materializeWorkspaceBundle<
	TBundle extends { files: Map<string, string>; manifestPath: string },
>(options: MaterializeWorkspaceBundleOptions<TBundle>): Promise<TBundle> {
	let reused = false;
	return await traceSandboxOperation(
		'materialize-bundle',
		{
			inputs: { resource: options.resourceLabel },
			processResult: (bundle) => ({
				outputs: {
					reused,
					fileCount: bundle.files.size,
					bytesWritten: reused
						? 0
						: [...bundle.files.values()].reduce(
								(sum, content) => sum + sandboxFileBytes(content),
								0,
							),
				},
			}),
		},
		async () => {
			const prebaked = await options.loadPrebaked();
			if (prebaked) {
				reused = true;
				return prebaked;
			}

			const bundle = await options.buildBundle();
			const payloadFiles = new Map(bundle.files);
			payloadFiles.delete(bundle.manifestPath);

			await writeWorkspaceFileMap(options.workspace, payloadFiles, {
				logger: options.logger,
				resourceLabel: options.resourceLabel,
			});

			const manifestContent = bundle.files.get(bundle.manifestPath);
			if (manifestContent !== undefined) {
				await writeWorkspaceFile(options.workspace, bundle.manifestPath, manifestContent, {
					logger: options.logger,
					resourceLabel: options.resourceLabel,
				});
			}

			options.verifiedBundles?.set(bundle.manifestPath, options.bundleHash(bundle));
			options.logger.debug(options.materializedLogMessage, options.materializedLogContext(bundle));
			return bundle;
		},
	);
}
