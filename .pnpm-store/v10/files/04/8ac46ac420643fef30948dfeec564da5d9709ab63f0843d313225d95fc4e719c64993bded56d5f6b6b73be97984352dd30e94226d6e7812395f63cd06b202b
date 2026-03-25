import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem, type IApiDeclaredItemOptions, type IApiDeclaredItemJson } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin, type IApiReleaseTagMixinOptions } from '../mixins/ApiReleaseTagMixin';
import { ApiReadonlyMixin, type IApiReadonlyMixinOptions } from '../mixins/ApiReadonlyMixin';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiInitializerMixin, type IApiInitializerMixinOptions } from '../mixins/ApiInitializerMixin';
import type { IExcerptTokenRange, Excerpt } from '../mixins/Excerpt';
import type { DeserializerContext } from './DeserializerContext';
import { type IApiExportedMixinJson, type IApiExportedMixinOptions, ApiExportedMixin } from '../mixins/ApiExportedMixin';
/**
 * Constructor options for {@link ApiVariable}.
 * @public
 */
export interface IApiVariableOptions extends IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiReadonlyMixinOptions, IApiDeclaredItemOptions, IApiInitializerMixinOptions, IApiExportedMixinOptions {
    variableTypeTokenRange: IExcerptTokenRange;
}
export interface IApiVariableJson extends IApiDeclaredItemJson, IApiExportedMixinJson {
    variableTypeTokenRange: IExcerptTokenRange;
}
declare const ApiVariable_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiInitializerMixin) & (new (...args: any[]) => ApiReadonlyMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin);
/**
 * Represents a TypeScript variable declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiVariable` represents an exported `const` or `let` object such as these examples:
 *
 * ```ts
 * // A variable declaration
 * export let verboseLogging: boolean;
 *
 * // A constant variable declaration with an initializer
 * export const canvas: IWidget = createCanvas();
 * ```
 *
 * @public
 */
export declare class ApiVariable extends ApiVariable_base {
    /**
     * An {@link Excerpt} that describes the type of the variable.
     */
    readonly variableTypeExcerpt: Excerpt;
    constructor(options: IApiVariableOptions);
    /** @override */
    static onDeserializeInto(options: Partial<IApiVariableOptions>, context: DeserializerContext, jsonObject: IApiVariableJson): void;
    static getContainerKey(name: string): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @override */
    serializeInto(jsonObject: Partial<IApiVariableJson>): void;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiVariable.d.ts.map