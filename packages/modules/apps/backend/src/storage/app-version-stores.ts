import type { OperationContext } from '@n8n/db';

export type AppFiles = ReadonlyMap<string, Buffer>;

export type NewSourceVersion = {
	id: string;
	appId: string;
	expectedDraftVersionId: string | null;
	label: string | null;
};

export abstract class AppSourceVersionStore {
	/** Creates a source-backed version with a queued build and advances the draft atomically. */
	abstract createVersion(version: NewSourceVersion, files: AppFiles): Promise<void>;

	abstract readSource(versionId: string): Promise<AppFiles>;

	abstract listSourceFiles(versionId: string): Promise<string[]>;

	abstract readSourceFile(versionId: string, filePath: string): Promise<Buffer | null>;

	/** Removes selected versions in the caller's transaction. */
	abstract removeVersions(versionIds: string[], ctx: OperationContext): Promise<void>;
}

export abstract class AppBuildResultStore {
	/** Attaches a stored bundle and records build success atomically. */
	abstract recordSuccess(appId: string, versionId: string, files: AppFiles): Promise<void>;

	abstract readBundle(versionId: string): Promise<AppFiles>;

	/** Removes selected bundles in the caller's transaction. */
	abstract removeBundles(versionIds: string[], ctx: OperationContext): Promise<void>;
}
