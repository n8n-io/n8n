import * as tsdoc from '@microsoft/tsdoc';
import type { AstDeclaration } from './AstDeclaration';
import type { Collector } from '../collector/Collector';
/**
 * Used by `AstReferenceResolver` to report a failed resolution.
 *
 * @privateRemarks
 * This class is similar to an `Error` object, but the intent of `ResolverFailure` is to describe
 * why a reference could not be resolved.  This information could be used to throw an actual `Error` object,
 * but normally it is handed off to the `MessageRouter` instead.
 */
export declare class ResolverFailure {
    /**
     * Details about why the failure occurred.
     */
    readonly reason: string;
    constructor(reason: string);
}
/**
 * This resolves a TSDoc declaration reference by walking the `AstSymbolTable` compiler state.
 *
 * @remarks
 *
 * This class is analogous to `ModelReferenceResolver` from the `@microsoft/api-extractor-model` project,
 * which resolves declaration references by walking the hierarchy loaded from an .api.json file.
 */
export declare class AstReferenceResolver {
    private readonly _collector;
    private readonly _astSymbolTable;
    private readonly _workingPackage;
    constructor(collector: Collector);
    resolve(declarationReference: tsdoc.DocDeclarationReference): AstDeclaration | ResolverFailure;
    private _getMemberReferenceIdentifier;
    private _selectDeclaration;
    private _selectUsingSystemSelector;
    private _selectUsingIndexSelector;
    /**
     * This resolves an ambiguous match in the case where the extra matches are all ancillary declarations,
     * except for one match that is the main declaration.
     */
    private _tryDisambiguateAncillaryMatches;
}
//# sourceMappingURL=AstReferenceResolver.d.ts.map