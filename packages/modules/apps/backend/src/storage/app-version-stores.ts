export type AppFiles = ReadonlyMap<string, Buffer>;

export type NewSourceVersion = {
	id: string;
	appId: string;
	projectId: string;
	expectedDraftVersionId: string | null;
	label: string | null;
};

export abstract class AppSourceVersionStore {
	/** Creates a source-backed version with a queued build and advances the draft atomically. */
	abstract createVersion(version: NewSourceVersion, files: AppFiles): Promise<void>;
	abstract readSource(versionId: string): Promise<AppFiles>;
	abstract listSourceFiles(versionId: string): Promise<string[]>;
	abstract readSourceFile(versionId: string, filePath: string): Promise<Buffer | null>;
}

export abstract class AppBuildResultStore {
	/** Attaches a stored bundle and records build success atomically. */
	abstract recordSuccess(versionId: string, files: AppFiles): Promise<void>;
	abstract readBundle(versionId: string): Promise<AppFiles>;
}
