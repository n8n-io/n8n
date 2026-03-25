import { type NewlineKind } from '@rushstack/node-core-library';
import type { Collector } from '../collector/Collector';
/**
 * Used with DtsRollupGenerator.writeTypingsFile()
 */
export declare enum DtsRollupKind {
    /**
     * Generate a *.d.ts file for an internal release, or for the trimming=false mode.
     * This output file will contain all definitions that are reachable from the entry point.
     */
    InternalRelease = 0,
    /**
     * Generate a *.d.ts file for a preview release.
     * This output file will contain all definitions that are reachable from the entry point,
     * except definitions marked as \@internal.
     */
    AlphaRelease = 1,
    /**
     * Generate a *.d.ts file for a preview release.
     * This output file will contain all definitions that are reachable from the entry point,
     * except definitions marked as \@alpha or \@internal.
     */
    BetaRelease = 2,
    /**
     * Generate a *.d.ts file for a public release.
     * This output file will contain all definitions that are reachable from the entry point,
     * except definitions marked as \@beta, \@alpha, or \@internal.
     */
    PublicRelease = 3
}
export declare class DtsRollupGenerator {
    /**
     * Generates the typings file and writes it to disk.
     *
     * @param dtsFilename    - The *.d.ts output filename
     */
    static writeTypingsFile(collector: Collector, dtsFilename: string, dtsKind: DtsRollupKind, newlineKind: NewlineKind): void;
    private static _generateTypingsFileContent;
    /**
     * Before writing out a declaration, _modifySpan() applies various fixups to make it nice.
     */
    private static _modifySpan;
    private static _shouldIncludeReleaseTag;
}
//# sourceMappingURL=DtsRollupGenerator.d.ts.map