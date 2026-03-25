import type * as ts from 'typescript';
import type * as tsdoc from '@microsoft/tsdoc';
import type { INodePackageJson } from '@rushstack/node-core-library';
/**
 * Constructor options for WorkingPackage
 */
export interface IWorkingPackageOptions {
    packageFolder: string;
    packageJson: INodePackageJson;
    entryPointSourceFile: ts.SourceFile;
}
/**
 * Information about the working package for a particular invocation of API Extractor.
 *
 * @remarks
 * API Extractor tries to model the world as a collection of NPM packages, such that each
 * .d.ts file belongs to at most one package.  When API Extractor is invoked on a project,
 * we refer to that project as being the "working package".  There is exactly one
 * "working package" for the duration of this analysis.  Any files that do not belong to
 * the working package are referred to as "external":  external declarations belonging to
 * external packages.
 *
 * If API Extractor is invoked on a standalone .d.ts file, the "working package" may not
 * have an actual package.json file on disk, but we still refer to it in concept.
 */
export declare class WorkingPackage {
    /**
     * Returns the folder for the package.json file of the working package.
     *
     * @remarks
     * If the entry point is `C:\Folder\project\src\index.ts` and the nearest package.json
     * is `C:\Folder\project\package.json`, then the packageFolder is `C:\Folder\project`
     */
    readonly packageFolder: string;
    /**
     * The parsed package.json file for the working package.
     */
    readonly packageJson: INodePackageJson;
    /**
     * The entry point being processed during this invocation of API Extractor.
     *
     * @remarks
     * The working package may have multiple entry points; however, today API Extractor
     * only processes a single entry point during an invocation.  This will be improved
     * in the future.
     */
    readonly entryPointSourceFile: ts.SourceFile;
    /**
     * The `@packageDocumentation` comment, if any, for the working package.
     */
    tsdocComment: tsdoc.DocComment | undefined;
    /**
     * Additional parser information for `WorkingPackage.tsdocComment`.
     */
    tsdocParserContext: tsdoc.ParserContext | undefined;
    constructor(options: IWorkingPackageOptions);
    /**
     * Returns the full name of the working package.
     */
    get name(): string;
}
//# sourceMappingURL=WorkingPackage.d.ts.map