import type { Logger } from '../logger';
import {
	readWorkspaceFile,
	writeWorkspaceFile,
	writeWorkspaceFileMap,
	type WorkspaceFileTarget,
} from './workspace-files';
import { parseVersionedWorkspaceManifest } from './workspace-manifest';

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
	const manifestRaw = await readWorkspaceFile(options.workspace, options.manifestPath, {
		logger: options.logger,
		resourceLabel: options.resourceLabel,
	});
	if (!manifestRaw) return undefined;

	const manifest = parseVersionedWorkspaceManifest(manifestRaw, {
		schemaVersion: options.schemaVersion,
		hashField: options.hashField,
	});
	if (!manifest) {
		options.logger.debug(options.invalidManifestLogMessage, {
			manifestPath: options.manifestPath,
		});
		return undefined;
	}

	if (manifest.hash !== options.expectedHash) {
		options.logger.debug(options.staleManifestLogMessage, {
			manifestPath: options.manifestPath,
			[options.staleManifestLogKeys.expected]: options.expectedHash,
			[options.staleManifestLogKeys.actual]: manifest.hash,
		});
		return undefined;
	}

	const bundle = await options.buildBundle();
	if (!bundle) return undefined;

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
		options.logger.debug('Ignoring incomplete prebaked workspace bundle', {
			manifestPath: options.manifestPath,
			missingPath,
		});
		return undefined;
	}

	options.logger.debug(options.successLogMessage, options.successLogContext(bundle));
	return bundle;
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
	const prebaked = await options.loadPrebaked();
	if (prebaked) return prebaked;

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
}
