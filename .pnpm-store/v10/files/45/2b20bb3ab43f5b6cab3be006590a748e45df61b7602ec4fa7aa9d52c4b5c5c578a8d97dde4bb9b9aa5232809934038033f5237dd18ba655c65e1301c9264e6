import type { Options, SucraseContext, Transform } from "../index";
import { type ClassInfo } from "../util/getClassInfo";
export interface RootTransformerResult {
    code: string;
    mappings: Array<number | undefined>;
}
export default class RootTransformer {
    private transformers;
    private nameManager;
    private tokens;
    private generatedVariables;
    private isImportsTransformEnabled;
    private isReactHotLoaderTransformEnabled;
    private disableESTransforms;
    private helperManager;
    constructor(sucraseContext: SucraseContext, transforms: Array<Transform>, enableLegacyBabel5ModuleInterop: boolean, options: Options);
    transform(): RootTransformerResult;
    processBalancedCode(): void;
    processToken(): void;
    /**
     * Skip past a class with a name and return that name.
     */
    processNamedClass(): string;
    processClass(): void;
    /**
     * We want to just handle class fields in all contexts, since TypeScript supports them. Later,
     * when some JS implementations support class fields, this should be made optional.
     */
    processClassBody(classInfo: ClassInfo, className: string | null): void;
    makeConstructorInitCode(constructorInitializerStatements: Array<string>, instanceInitializerNames: Array<string>, className: string): string;
    /**
     * Normally it's ok to simply remove type tokens, but we need to be more careful when dealing with
     * arrow function return types since they can confuse the parser. In that case, we want to move
     * the close-paren to the same line as the arrow.
     *
     * See https://github.com/alangpierce/sucrase/issues/391 for more details.
     */
    processPossibleArrowParamEnd(): boolean;
    /**
     * An async arrow function might be of the form:
     *
     * async <
     *   T
     * >() => {}
     *
     * in which case, removing the type parameters will cause a syntax error. Detect this case and
     * move the open-paren earlier.
     */
    processPossibleAsyncArrowWithTypeParams(): boolean;
    processPossibleTypeRange(): boolean;
    shiftMappings(mappings: Array<number | undefined>, prefixLength: number): Array<number | undefined>;
}
