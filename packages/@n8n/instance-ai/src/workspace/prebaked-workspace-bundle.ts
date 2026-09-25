import type { Logger } from '../logger';
import {
	readWorkspaceFile,
	writeWorkspaceFile,
	writeWorkspaceFileMap,
	type WorkspaceFileTarget,
} from './workspace-files';
import { parseVersionedWorkspaceManifest } from './workspace-manifest';
import { traceSandboxOperation, sandboxFileBytes } from '../tracing/sandbox-tracing';

export interface LoadPrebakedWorkspaceBundleOptions<TBundle> {
	workspace: WorkspaceFileTarget;
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

/** Reuse a workspace bundle when its manifest hash matches the expected value. */
export async function loadPrebakedWorkspaceBundle<TBundle extends { files: Map<string, string> }>(
	options: LoadPrebakedWorkspaceBundleOptions<TBundle>,
): Promise<TBundle | undefined> {
	let decision = 'reused';
	let actualHash: string | undefined;
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

			const payloadPaths = Array.from(bundle.files.keys()).filter(
				(path) => path !== options.manifestPath,
			);
			const existenceChecks = await Promise.all(
				payloadPaths.map(async (path) => ({
					path,
					exists:
						(await readWorkspaceFile(options.workspace, path, {
							logger: options.logger,
							resourceLabel: options.resourceLabel,
						})) !== null,
				})),
			);
			const missingPath = existenceChecks.find((check) => !check.exists)?.path;
			if (missingPath) {
				decision = 'incomplete';
				options.logger.debug('Ignoring incomplete prebaked workspace bundle', {
					manifestPath: options.manifestPath,
					missingPath,
				});
				return undefined;
			}

			options.logger.debug(options.successLogMessage, options.successLogContext(bundle));
			return bundle;
		},
	);
}

export interface MaterializeWorkspaceBundleOptions<
	TBundle extends { files: Map<string, string>; manifestPath: string },
> {
	workspace: WorkspaceFileTarget;
	resourceLabel: string;
	logger: Logger;
	loadPrebaked: () => Promise<TBundle | undefined>;
	buildBundle: () => Promise<TBundle> | TBundle;
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

			options.logger.debug(options.materializedLogMessage, options.materializedLogContext(bundle));
			return bundle;
		},
	);
}
