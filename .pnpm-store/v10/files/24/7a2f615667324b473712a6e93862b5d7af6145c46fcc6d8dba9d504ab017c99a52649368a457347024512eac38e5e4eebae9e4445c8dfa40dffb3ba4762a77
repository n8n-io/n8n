import type NameManager from "../NameManager";
import type TokenProcessor from "../TokenProcessor";
import type RootTransformer from "../transformers/RootTransformer";
export interface ClassHeaderInfo {
    isExpression: boolean;
    className: string | null;
    hasSuperclass: boolean;
}
export interface TokenRange {
    start: number;
    end: number;
}
export interface FieldInfo extends TokenRange {
    equalsIndex: number;
    initializerName: string;
}
/**
 * Information about a class returned to inform the implementation of class fields and constructor
 * initializers.
 */
export interface ClassInfo {
    headerInfo: ClassHeaderInfo;
    constructorInitializerStatements: Array<string>;
    instanceInitializerNames: Array<string>;
    staticInitializerNames: Array<string>;
    constructorInsertPos: number | null;
    fields: Array<FieldInfo>;
    rangesToRemove: Array<TokenRange>;
}
/**
 * Get information about the class fields for this class, given a token processor pointing to the
 * open-brace at the start of the class.
 */
export default function getClassInfo(rootTransformer: RootTransformer, tokens: TokenProcessor, nameManager: NameManager, disableESTransforms: boolean): ClassInfo;
