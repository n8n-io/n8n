import { type PackageJsonLookup, type NewlineKind, type INodePackageJson } from '@rushstack/node-core-library';
import type { MessageRouter } from '../collector/MessageRouter';
/**
 * Represents analyzed information for a package.json file.
 * This object is constructed and returned by PackageMetadataManager.
 */
export declare class PackageMetadata {
    /**
     * The absolute path to the package.json file being analyzed.
     */
    readonly packageJsonPath: string;
    /**
     * The parsed contents of package.json.  Note that PackageJsonLookup
     * only includes essential fields.
     */
    readonly packageJson: INodePackageJson;
    /**
     * If true, then the package's documentation comments can be assumed
     * to contain API Extractor compatible TSDoc tags.
     */
    readonly aedocSupported: boolean;
    constructor(packageJsonPath: string, packageJson: INodePackageJson, aedocSupported: boolean);
}
/**
 * This class maintains a cache of analyzed information obtained from package.json
 * files.  It is built on top of the PackageJsonLookup class.
 *
 * @remarks
 *
 * IMPORTANT: Don't use PackageMetadataManager to analyze source files from the current project:
 * 1. Files such as tsdoc-metadata.json may not have been built yet, and thus may contain incorrect information.
 * 2. The current project is not guaranteed to have a package.json file at all.  For example, API Extractor can
 *    be invoked on a bare .d.ts file.
 *
 * Use ts.program.isSourceFileFromExternalLibrary() to test source files before passing the to PackageMetadataManager.
 */
export declare class PackageMetadataManager {
    static tsdocMetadataFilename: string;
    private readonly _packageJsonLookup;
    private readonly _messageRouter;
    private readonly _packageMetadataByPackageJsonPath;
    constructor(packageJsonLookup: PackageJsonLookup, messageRouter: MessageRouter);
    /**
     * This feature is still being standardized: https://github.com/microsoft/tsdoc/issues/7
     * In the future we will use the @microsoft/tsdoc library to read this file.
     */
    private static _resolveTsdocMetadataPathFromPackageJson;
    /**
     * @param tsdocMetadataPath - An explicit path that can be configured in api-extractor.json.
     * If this parameter is not an empty string, it overrides the normal path calculation.
     * @returns the absolute path to the TSDoc metadata file
     */
    static resolveTsdocMetadataPath(packageFolder: string, packageJson: INodePackageJson, tsdocMetadataPath?: string): string;
    /**
     * Writes the TSDoc metadata file to the specified output file.
     */
    static writeTsdocMetadataFile(tsdocMetadataPath: string, newlineKind: NewlineKind): void;
    /**
     * Finds the package.json in a parent folder of the specified source file, and
     * returns a PackageMetadata object.  If no package.json was found, then undefined
     * is returned.  The results are cached.
     */
    tryFetchPackageMetadata(sourceFilePath: string): PackageMetadata | undefined;
    /**
     * Returns true if the source file is part of a package whose .d.ts files support AEDoc annotations.
     */
    isAedocSupportedFor(sourceFilePath: string): boolean;
}
//# sourceMappingURL=PackageMetadataManager.d.ts.map