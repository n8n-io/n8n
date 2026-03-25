import { type DocDeclarationReference } from '@microsoft/tsdoc';
import { type ApiItem } from '../items/ApiItem';
import type { ApiModel } from './ApiModel';
/**
 * Result object for {@link ApiModel.resolveDeclarationReference}.
 *
 * @public
 */
export interface IResolveDeclarationReferenceResult {
    /**
     * The referenced ApiItem, if the declaration reference could be resolved.
     */
    resolvedApiItem: ApiItem | undefined;
    /**
     * If resolvedApiItem is undefined, then this will always contain an error message explaining why the
     * resolution failed.
     */
    errorMessage: string | undefined;
}
/**
 * This resolves a TSDoc declaration reference by walking the `ApiModel` hierarchy.
 *
 * @remarks
 *
 * This class is analogous to `AstReferenceResolver` from the `@microsoft/api-extractor` project,
 * which resolves declaration references by walking the compiler state.
 */
export declare class ModelReferenceResolver {
    private readonly _apiModel;
    constructor(apiModel: ApiModel);
    resolve(declarationReference: DocDeclarationReference, contextApiItem: ApiItem | undefined): IResolveDeclarationReferenceResult;
    private _selectUsingSystemSelector;
    private _selectUsingIndexSelector;
}
//# sourceMappingURL=ModelReferenceResolver.d.ts.map