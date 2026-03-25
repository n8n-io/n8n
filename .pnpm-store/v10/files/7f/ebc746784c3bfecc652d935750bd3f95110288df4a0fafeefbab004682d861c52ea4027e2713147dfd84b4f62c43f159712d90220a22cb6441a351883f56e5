/**
 * Use this library to read and write *.api.json files as defined by the
 * {@link https://api-extractor.com/ | API Extractor}  tool.  These files are used to generate a documentation
 * website for your TypeScript package.  The files store the API signatures and doc comments that were extracted
 * from your package.
 *
 * @packageDocumentation
 */

import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { DocDeclarationReference } from '@microsoft/tsdoc';
import { IJsonFileSaveOptions } from '@rushstack/node-core-library';
import { JsonObject } from '@rushstack/node-core-library';
import * as tsdoc from '@microsoft/tsdoc';
import { TSDocConfiguration } from '@microsoft/tsdoc';
import { TSDocTagDefinition } from '@microsoft/tsdoc';

/**
 * @internal
 * @deprecated - tsdoc configuration is now constructed from tsdoc.json files associated with each package.
 */
export declare class AedocDefinitions {
    static readonly betaDocumentation: TSDocTagDefinition;
    static readonly internalRemarks: TSDocTagDefinition;
    static readonly preapprovedTag: TSDocTagDefinition;
    static get tsdocConfiguration(): TSDocConfiguration;
    private static _tsdocConfiguration;
}

/**
 * Mixin function for {@link (ApiAbstractMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiAbstractMixin:interface)}
 * functionality.
 *
 * @public
 */
export declare function ApiAbstractMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiAbstractMixin);

/**
 * The mixin base class for API items that have an abstract modifier.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiAbstractMixin extends ApiItem {
    /**
     * Indicates that the API item's value has an 'abstract' modifier.
     */
    readonly isAbstract: boolean;
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}

/**
 * Static members for {@link (ApiAbstractMixin:interface)}.
 * @public
 */
export declare namespace ApiAbstractMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiAbstractMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiAbstractMixin;
}

/**
 * Represents a TypeScript function call signature.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiCallSignature` represents a TypeScript declaration such as `(x: number, y: number): number`
 * in this example:
 *
 * ```ts
 * export interface IChooser {
 *   // A call signature:
 *   (x: number, y: number): number;
 *
 *   // Another overload for this call signature:
 *   (x: string, y: string): string;
 * }
 *
 * function chooseFirst<T>(x: T, y: T): T {
 *   return x;
 * }
 *
 * let chooser: IChooser = chooseFirst;
 * ```
 *
 * @public
 */
export declare class ApiCallSignature extends ApiCallSignature_base {
    constructor(options: IApiCallSignatureOptions);
    static getContainerKey(overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiCallSignature_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiReturnTypeMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiParameterListMixin) & (new (...args: any[]) => ApiTypeParameterListMixin);

/**
 * Represents a TypeScript class declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiClass` represents a TypeScript declaration such as this:
 *
 * ```ts
 * export class X { }
 * ```
 *
 * @public
 */
export declare class ApiClass extends ApiClass_base {
    /**
     * The base class that this class inherits from (using the `extends` keyword), or undefined if there is no base class.
     */
    readonly extendsType: HeritageType | undefined;
    private readonly _implementsTypes;
    constructor(options: IApiClassOptions);
    static getContainerKey(name: string): string;
    /** @override */
    static onDeserializeInto(options: Partial<IApiClassOptions>, context: DeserializerContext, jsonObject: IApiClassJson): void;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /**
     * The list of interfaces that this class implements using the `implements` keyword.
     */
    get implementsTypes(): ReadonlyArray<HeritageType>;
    /** @override */
    serializeInto(jsonObject: Partial<IApiClassJson>): void;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiClass_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiTypeParameterListMixin) & (new (...args: any[]) => ApiAbstractMixin) & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);

/**
 * Represents a TypeScript class constructor declaration that belongs to an `ApiClass`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiConstructor` represents a declaration using the `constructor` keyword such as in this example:
 *
 * ```ts
 * export class Vector {
 *   public x: number;
 *   public y: number;
 *
 *   // A class constructor:
 *   public constructor(x: number, y: number) {
 *     this.x = x;
 *     this.y = y;
 *   }
 * }
 * ```
 *
 * Compare with {@link ApiConstructSignature}, which describes the construct signature for a class constructor.
 *
 * @public
 */
export declare class ApiConstructor extends ApiConstructor_base {
    constructor(options: IApiConstructorOptions);
    static getContainerKey(overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiConstructor_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiProtectedMixin) & (new (...args: any[]) => ApiParameterListMixin);

/**
 * Represents a TypeScript construct signature that belongs to an `ApiInterface`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiConstructSignature` represents a construct signature using the `new` keyword such as in this example:
 *
 * ```ts
 * export interface IVector {
 *   x: number;
 *   y: number;
 * }
 *
 * export interface IVectorConstructor {
 *   // A construct signature:
 *   new(x: number, y: number): IVector;
 * }
 *
 * export function createVector(vectorConstructor: IVectorConstructor,
 *   x: number, y: number): IVector {
 *   return new vectorConstructor(x, y);
 * }
 *
 * class Vector implements IVector {
 *   public x: number;
 *   public y: number;
 *   public constructor(x: number, y: number) {
 *     this.x = x;
 *     this.y = y;
 *   }
 * }
 *
 * let vector: Vector = createVector(Vector, 1, 2);
 * ```
 *
 * Compare with {@link ApiConstructor}, which describes the class constructor itself.
 *
 * @public
 */
export declare class ApiConstructSignature extends ApiConstructSignature_base {
    constructor(options: IApiConstructSignatureOptions);
    static getContainerKey(overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiConstructSignature_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiReturnTypeMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiParameterListMixin) & (new (...args: any[]) => ApiTypeParameterListMixin);

/**
 * The base class for API items that have an associated source code excerpt containing a TypeScript declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * Most `ApiItem` subclasses have declarations and thus extend `ApiDeclaredItem`.  Counterexamples include
 * `ApiModel` and `ApiPackage`, which do not have any corresponding TypeScript source code.
 *
 * @public
 */
export declare class ApiDeclaredItem extends ApiDocumentedItem {
    private _excerptTokens;
    private _excerpt;
    private _fileUrlPath?;
    private _sourceLocation?;
    constructor(options: IApiDeclaredItemOptions);
    /** @override */
    static onDeserializeInto(options: Partial<IApiDeclaredItemOptions>, context: DeserializerContext, jsonObject: IApiDeclaredItemJson): void;
    /**
     * The source code excerpt where the API item is declared.
     */
    get excerpt(): Excerpt;
    /**
     * The individual source code tokens that comprise the main excerpt.
     */
    get excerptTokens(): ReadonlyArray<ExcerptToken>;
    /**
     * The file URL path relative to the `projectFolder` and `projectFolderURL` fields
     * as defined in the `api-extractor.json` config. Is `undefined` if the path is
     * the same as the parent API item's.
     */
    get fileUrlPath(): string | undefined;
    /**
     * Returns the source location where the API item is declared.
     */
    get sourceLocation(): SourceLocation;
    /**
     * If the API item has certain important modifier tags such as `@sealed`, `@virtual`, or `@override`,
     * this prepends them as a doc comment above the excerpt.
     */
    getExcerptWithModifiers(): string;
    /** @override */
    serializeInto(jsonObject: Partial<IApiDeclaredItemJson>): void;
    /**
     * Constructs a new {@link Excerpt} corresponding to the provided token range.
     */
    buildExcerpt(tokenRange: IExcerptTokenRange): Excerpt;
    /**
     * Builds the cached object used by the `sourceLocation` property.
     */
    private _buildSourceLocation;
}

/**
 * An abstract base class for API declarations that can have an associated TSDoc comment.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * @public
 */
export declare class ApiDocumentedItem extends ApiItem {
    private _tsdocComment;
    constructor(options: IApiDocumentedItemOptions);
    /** @override */
    static onDeserializeInto(options: Partial<IApiDocumentedItemOptions>, context: DeserializerContext, jsonObject: IApiItemJson): void;
    get tsdocComment(): tsdoc.DocComment | undefined;
    /** @override */
    serializeInto(jsonObject: Partial<IApiDocumentedItemJson>): void;
}

/**
 * Represents the entry point for an NPM package.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiEntryPoint` represents the entry point to an NPM package.  API Extractor does not currently support
 * analysis of multiple entry points, but the `ApiEntryPoint` object is included to support a future feature.
 * In the current implementation, `ApiEntryPoint.importPath` is always the empty string.
 *
 * For example, suppose the package.json file looks like this:
 *
 * ```json
 * {
 *   "name": "example-library",
 *   "version": "1.0.0",
 *   "main": "./lib/index.js",
 *   "typings": "./lib/index.d.ts"
 * }
 * ```
 *
 * In this example, the `ApiEntryPoint` would represent the TypeScript module for `./lib/index.js`.
 *
 * @public
 */
export declare class ApiEntryPoint extends ApiEntryPoint_base {
    constructor(options: IApiEntryPointOptions);
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /**
     * The module path for this entry point, relative to the parent `ApiPackage`.  In the current implementation,
     * this is always the empty string, indicating the default entry point.
     *
     * @remarks
     *
     * API Extractor does not currently support analysis of multiple entry points.  If that feature is implemented
     * in the future, then the `ApiEntryPoint.importPath` will be used to distinguish different entry points,
     * for example: `controls/Button` in `import { Button } from "example-package/controls/Button";`.
     *
     * The `ApiEntryPoint.name` property stores the same value as `ApiEntryPoint.importPath`.
     */
    get importPath(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiEntryPoint_base: typeof ApiItem & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);

/**
 * Represents a TypeScript enum declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiEnum` represents an enum declaration such as `FontSizes` in the example below:
 *
 * ```ts
 * export enum FontSizes {
 *   Small = 100,
 *   Medium = 200,
 *   Large = 300
 * }
 * ```
 *
 * @public
 */
export declare class ApiEnum extends ApiEnum_base {
    constructor(options: IApiEnumOptions);
    static getContainerKey(name: string): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get members(): ReadonlyArray<ApiEnumMember>;
    /** @override */
    get containerKey(): string;
    /** @override */
    addMember(member: ApiEnumMember): void;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiEnum_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);

/**
 * Represents a member of a TypeScript enum declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiEnumMember` represents an enum member such as `Small = 100` in the example below:
 *
 * ```ts
 * export enum FontSizes {
 *   Small = 100,
 *   Medium = 200,
 *   Large = 300
 * }
 * ```
 *
 * @public
 */
export declare class ApiEnumMember extends ApiEnumMember_base {
    constructor(options: IApiEnumMemberOptions);
    static getContainerKey(name: string): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiEnumMember_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiInitializerMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin);

/**
 * Mixin function for {@link (ApiExportedMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiExportedMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiExportedMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiExportedMixin);

/**
 * The mixin base class for API items that can be exported.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiExportedMixin extends ApiItem {
    /**
     * Whether the declaration is exported from its parent item container (i.e. either an `ApiEntryPoint` or an
     * `ApiNamespace`).
     *
     * @remarks
     * Suppose `index.ts` is your entry point:
     *
     * ```ts
     * // index.ts
     *
     * export class A {}
     * class B {}
     *
     * namespace n {
     *   export class C {}
     *   class D {}
     * }
     *
     * // file.ts
     * export class E {}
     * ```
     *
     * Classes `A` and `C` are both exported, while classes `B`, `D`, and `E` are not. `E` is exported from its
     * local file, but not from its parent item container (i.e. the entry point).
     *
     */
    readonly isExported: boolean;
    /** @override */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}

/**
 * Static members for {@link (ApiExportedMixin:interface)}.
 * @public
 */
export declare namespace ApiExportedMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiExportedMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiExportedMixin;
}

/**
 * Represents a TypeScript function declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiFunction` represents a TypeScript declaration such as this example:
 *
 * ```ts
 * export function getAverage(x: number, y: number): number {
 *   return (x + y) / 2.0;
 * }
 * ```
 *
 * Functions are exported by an entry point module or by a namespace.  Compare with {@link ApiMethod}, which
 * represents a function that is a member of a class.
 *
 * @public
 */
export declare class ApiFunction extends ApiFunction_base {
    constructor(options: IApiFunctionOptions);
    static getContainerKey(name: string, overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiFunction_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReturnTypeMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiParameterListMixin) & (new (...args: any[]) => ApiTypeParameterListMixin) & (new (...args: any[]) => ApiNameMixin);

/**
 * Represents a TypeScript index signature.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiIndexSignature` represents a TypeScript declaration such as `[x: number]: number` in this example:
 *
 * ```ts
 * export interface INumberTable {
 *   // An index signature
 *   [value: number]: number;
 *
 *   // An overloaded index signature
 *   [name: string]: number;
 * }
 * ```
 *
 * @public
 */
export declare class ApiIndexSignature extends ApiIndexSignature_base {
    constructor(options: IApiIndexSignatureOptions);
    static getContainerKey(overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiIndexSignature_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiReadonlyMixin) & (new (...args: any[]) => ApiReturnTypeMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiParameterListMixin);

/**
 * Mixin function for {@link (ApiInitializerMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiInitializerMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiInitializerMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiInitializerMixin);

/**
 * The mixin base class for API items that can have an initializer.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiInitializerMixin extends ApiItem {
    /**
     * An {@link Excerpt} that describes the item's initializer.
     */
    readonly initializerExcerpt?: Excerpt;
    /** @override */
    serializeInto(jsonObject: Partial<IApiInitializerMixinJson>): void;
}

/**
 * Static members for {@link (ApiInitializerMixin:interface)}.
 * @public
 */
export declare namespace ApiInitializerMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiInitializerMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiInitializerMixin;
}

/**
 * Represents a TypeScript class declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiInterface` represents a TypeScript declaration such as this:
 *
 * ```ts
 * export interface X extends Y {
 * }
 * ```
 *
 * @public
 */
export declare class ApiInterface extends ApiInterface_base {
    private readonly _extendsTypes;
    constructor(options: IApiInterfaceOptions);
    static getContainerKey(name: string): string;
    /** @override */
    static onDeserializeInto(options: Partial<IApiInterfaceOptions>, context: DeserializerContext, jsonObject: IApiInterfaceJson): void;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /**
     * The list of base interfaces that this interface inherits from using the `extends` keyword.
     */
    get extendsTypes(): ReadonlyArray<HeritageType>;
    /** @override */
    serializeInto(jsonObject: Partial<IApiInterfaceJson>): void;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiInterface_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiTypeParameterListMixin) & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);

/**
 * The abstract base class for all members of an `ApiModel` object.
 *
 * @remarks
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 * @public
 */
export declare class ApiItem {
    private _canonicalReference;
    private _parent;
    constructor(options: IApiItemOptions);
    static deserialize(jsonObject: IApiItemJson, context: DeserializerContext): ApiItem;
    /** @virtual */
    static onDeserializeInto(options: Partial<IApiItemOptions>, context: DeserializerContext, jsonObject: IApiItemJson): void;
    /** @virtual */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
    /**
     * Identifies the subclass of the `ApiItem` base class.
     * @virtual
     */
    get kind(): ApiItemKind;
    /**
     * Warning: This API is used internally by API extractor but is not yet ready for general usage.
     *
     * @remarks
     *
     * Returns a `DeclarationReference` object using the experimental new declaration reference notation.
     *
     * @beta
     */
    get canonicalReference(): DeclarationReference;
    /**
     * Returns a string key that can be used to efficiently retrieve an `ApiItem` from an `ApiItemContainerMixin`.
     * The key is unique within the container.  Its format is undocumented and may change at any time.
     *
     * @remarks
     * Use the `getContainerKey()` static member to construct the key.  Each subclass has a different implementation
     * of this function, according to the aspects that are important for identifying it.
     *
     * @virtual
     */
    get containerKey(): string;
    /**
     * Returns a name for this object that can be used in diagnostic messages, for example.
     *
     * @remarks
     * For an object that inherits ApiNameMixin, this will return the declared name (e.g. the name of a TypeScript
     * function).  Otherwise, it will return a string such as "(call signature)" or "(model)".
     *
     * @virtual
     */
    get displayName(): string;
    /**
     * If this item was added to a ApiItemContainerMixin item, then this returns the container item.
     * If this is an Parameter that was added to a method or function, then this returns the function item.
     * Otherwise, it returns undefined.
     * @virtual
     */
    get parent(): ApiItem | undefined;
    /**
     * This property supports a visitor pattern for walking the tree.
     * For items with ApiItemContainerMixin, it returns the contained items, sorted alphabetically.
     * Otherwise it returns an empty array.
     * @virtual
     */
    get members(): ReadonlyArray<ApiItem>;
    /**
     * If this item has a name (i.e. extends `ApiNameMixin`), then return all items that have the same parent
     * and the same name.  Otherwise, return all items that have the same parent and the same `ApiItemKind`.
     *
     * @remarks
     * Examples: For a function, this would return all overloads for the function.  For a constructor, this would
     * return all overloads for the constructor.  For a merged declaration (e.g. a `namespace` and `enum` with the
     * same name), this would return both declarations.  If this item does not have a parent, or if it is the only
     * item of its name/kind, then the result is an array containing only this item.
     */
    getMergedSiblings(): ReadonlyArray<ApiItem>;
    /**
     * Returns the chain of ancestors, starting from the root of the tree, and ending with the this item.
     */
    getHierarchy(): ReadonlyArray<ApiItem>;
    /**
     * This returns a scoped name such as `"Namespace1.Namespace2.MyClass.myMember()"`.  It does not include the
     * package name or entry point.
     *
     * @remarks
     * If called on an ApiEntrypoint, ApiPackage, or ApiModel item, the result is an empty string.
     */
    getScopedNameWithinPackage(): string;
    /**
     * If this item is an ApiPackage or has an ApiPackage as one of its parents, then that object is returned.
     * Otherwise undefined is returned.
     */
    getAssociatedPackage(): ApiPackage | undefined;
    /**
     * If this item is an ApiModel or has an ApiModel as one of its parents, then that object is returned.
     * Otherwise undefined is returned.
     */
    getAssociatedModel(): ApiModel | undefined;
    /**
     * A text string whose value determines the sort order that is automatically applied by the
     * {@link (ApiItemContainerMixin:interface)} class.
     *
     * @remarks
     * The value of this string is undocumented and may change at any time.
     * If {@link (ApiItemContainerMixin:interface).preserveMemberOrder} is enabled for the `ApiItem`'s parent,
     * then no sorting is performed, and this key is not used.
     *
     * @virtual
     */
    getSortKey(): string;
    /**
     * PRIVATE
     *
     * @privateRemarks
     * Allows ApiItemContainerMixin to assign the parent when the item is added to a container.
     *
     * @internal
     */
    [apiItem_onParentChanged](parent: ApiItem | undefined): void;
    /**
     * Builds the cached object used by the `canonicalReference` property.
     * @virtual
     */
    protected buildCanonicalReference(): DeclarationReference;
}

declare const apiItem_onParentChanged: unique symbol;

/**
 * Mixin function for {@link ApiDeclaredItem}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiItemContainerMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiItemContainerMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiItemContainerMixin);

/**
 * The mixin base class for API items that act as containers for other child items.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * Examples of `ApiItemContainerMixin` child classes include `ApiModel`, `ApiPackage`, `ApiEntryPoint`,
 * and `ApiEnum`.  But note that `Parameter` is not considered a "member" of an `ApiMethod`; this relationship
 * is modeled using {@link (ApiParameterListMixin:interface).parameters} instead
 * of {@link ApiItem.members}.
 *
 * @public
 */
export declare interface ApiItemContainerMixin extends ApiItem {
    /**
     * Disables automatic sorting of {@link ApiItem.members}.
     *
     * @remarks
     * By default `ApiItemContainerMixin` will automatically sort its members according to their
     * {@link ApiItem.getSortKey} string, which provides a standardized mostly alphabetical ordering
     * that is appropriate for most API items.  When loading older .api.json files the automatic sorting
     * is reapplied and may update the ordering.
     *
     * Set `preserveMemberOrder` to true to disable automatic sorting for this container; instead, the
     * members will retain whatever ordering appeared in the {@link IApiItemContainerMixinOptions.members} array.
     * The `preserveMemberOrder` option is saved in the .api.json file.
     */
    readonly preserveMemberOrder: boolean;
    /**
     * Adds a new member to the container.
     *
     * @remarks
     * An ApiItem cannot be added to more than one container.
     */
    addMember(member: ApiItem): void;
    /**
     * Attempts to retrieve a member using its containerKey, or returns `undefined` if no matching member was found.
     *
     * @remarks
     * Use the `getContainerKey()` static member to construct the key.  Each subclass has a different implementation
     * of this function, according to the aspects that are important for identifying it.
     *
     * See {@link ApiItem.containerKey} for more information.
     */
    tryGetMemberByKey(containerKey: string): ApiItem | undefined;
    /**
     * Returns a list of members with the specified name.
     */
    findMembersByName(name: string): ReadonlyArray<ApiItem>;
    /**
     * Finds all of the ApiItem's immediate and inherited members by walking up the inheritance tree.
     *
     * @remarks
     *
     * Given the following class heritage:
     *
     * ```
     * export class A {
     *   public a: number|boolean;
     * }
     *
     * export class B extends A {
     *   public a: number;
     *   public b: string;
     * }
     *
     * export class C extends B {
     *   public c: boolean;
     * }
     * ```
     *
     * Calling `findMembersWithInheritance` on `C` will return `B.a`, `B.b`, and `C.c`. Calling the
     * method on `B` will return `B.a` and `B.b`. And calling the method on `A` will return just
     * `A.a`.
     *
     * The inherited members returned by this method may be incomplete. If so, there will be a flag
     * on the result object indicating this as well as messages explaining the errors in more detail.
     * Some scenarios include:
     *
     * - Interface extending from a type alias.
     *
     * - Class extending from a variable.
     *
     * - Extending from a declaration not present in the model (e.g. external package).
     *
     * - Extending from an unexported declaration (e.g. ae-forgotten-export). Common in mixin
     *   patterns.
     *
     * - Unexpected runtime errors...
     *
     * Lastly, be aware that the types of inherited members are returned with respect to their
     * defining class as opposed to with respect to the inheriting class. For example, consider
     * the following:
     *
     * ```
     * export class A<T> {
     *   public a: T;
     * }
     *
     * export class B extends A<number> {}
     * ```
     *
     * When called on `B`, this method will return `B.a` with type `T` as opposed to type
     * `number`, although the latter is more accurate.
     */
    findMembersWithInheritance(): IFindApiItemsResult;
    /**
     * For a given member of this container, return its `ApiItem.getMergedSiblings()` list.
     * @internal
     */
    _getMergedSiblingsForMember(memberApiItem: ApiItem): ReadonlyArray<ApiItem>;
    /** @override */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}

/**
 * Static members for {@link (ApiItemContainerMixin:interface)}.
 * @public
 */
export declare namespace ApiItemContainerMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiItemContainerMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiItemContainerMixin;
}

/**
 * The type returned by the {@link ApiItem.kind} property, which can be used to easily distinguish subclasses of
 * {@link ApiItem}.
 *
 * @public
 */
export declare enum ApiItemKind {
    CallSignature = "CallSignature",
    Class = "Class",
    Constructor = "Constructor",
    ConstructSignature = "ConstructSignature",
    EntryPoint = "EntryPoint",
    Enum = "Enum",
    EnumMember = "EnumMember",
    Function = "Function",
    IndexSignature = "IndexSignature",
    Interface = "Interface",
    Method = "Method",
    MethodSignature = "MethodSignature",
    Model = "Model",
    Namespace = "Namespace",
    Package = "Package",
    Property = "Property",
    PropertySignature = "PropertySignature",
    TypeAlias = "TypeAlias",
    Variable = "Variable",
    None = "None"
}

declare enum ApiJsonSchemaVersion {
    /**
     * The initial release.
     */
    V_1000 = 1000,
    /**
     * Add support for type parameters and type alias types.
     */
    V_1001 = 1001,
    /**
     * Remove `canonicalReference` field.  This field was for diagnostic purposes only and was never deserialized.
     */
    V_1002 = 1002,
    /**
     * Reintroduce the `canonicalReference` field using the experimental new TSDoc declaration reference notation.
     *
     * This is not a breaking change because this field is never deserialized; it is provided for informational
     * purposes only.
     */
    V_1003 = 1003,
    /**
     * Add a `tsdocConfig` field that tracks the TSDoc configuration for parsing doc comments.
     *
     * This is not a breaking change because an older implementation will still work correctly.  The
     * custom tags will be skipped over by the parser.
     */
    V_1004 = 1004,
    /**
     * Add an `isOptional` field to `Parameter` and `TypeParameter` to track whether a function parameter is optional.
     *
     * When loading older JSON files, the value defaults to `false`.
     */
    V_1005 = 1005,
    /**
     * Add an `isProtected` field to `ApiConstructor`, `ApiMethod`, and `ApiProperty` to
     * track whether a class member has the `protected` modifier.
     *
     * Add an `isReadonly` field to `ApiProperty`, `ApiPropertySignature`, and `ApiVariable` to
     * track whether the item is readonly.
     *
     * When loading older JSON files, the values default to `false`.
     */
    V_1006 = 1006,
    /**
     * Add `ApiItemContainerMixin.preserveMemberOrder` to support enums that preserve their original sort order.
     *
     * When loading older JSON files, the value default to `false`.
     */
    V_1007 = 1007,
    /**
     * Add an `initializerTokenRange` field to `ApiProperty` and `ApiVariable` to track the item's
     * initializer.
     *
     * When loading older JSON files, this range is empty.
     */
    V_1008 = 1008,
    /**
     * Add an `isReadonly` field to `ApiIndexSignature` to track whether the item is readonly.
     *
     * When loading older JSON files, the values defaults to `false`.
     */
    V_1009 = 1009,
    /**
     * Add a `fileUrlPath` field to `ApiDeclaredItem` to track the URL to a declared item's source file.
     *
     * When loading older JSON files, the value defaults to `undefined`.
     */
    V_1010 = 1010,
    /**
     * Add an `isAbstract` field to `ApiClass`, `ApiMethod`, and `ApiProperty` to
     * track whether the item is abstract.
     *
     * When loading older JSON files, the value defaults to `false`.
     */
    V_1011 = 1011,
    /**
     * The current latest .api.json schema version.
     *
     * IMPORTANT: When incrementing this number, consider whether `OLDEST_SUPPORTED` or `OLDEST_FORWARDS_COMPATIBLE`
     * should be updated.
     */
    LATEST = 1011,
    /**
     * The oldest .api.json schema version that is still supported for backwards compatibility.
     *
     * This must be updated if you change to the file format and do not implement compatibility logic for
     * deserializing the older representation.
     */
    OLDEST_SUPPORTED = 1001,
    /**
     * Used to assign `IApiPackageMetadataJson.oldestForwardsCompatibleVersion`.
     *
     * This value must be \<= `ApiJsonSchemaVersion.LATEST`.  It must be reset to the `LATEST` value
     * if the older library would not be able to deserialize your new file format.  Adding a nonessential field
     * is generally okay.  Removing, modifying, or reinterpreting existing fields is NOT safe.
     */
    OLDEST_FORWARDS_COMPATIBLE = 1001
}

/**
 * Represents a TypeScript member function declaration that belongs to an `ApiClass`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiMethod` represents a TypeScript declaration such as the `render` member function in this example:
 *
 * ```ts
 * export class Widget {
 *   public render(): void { }
 * }
 * ```
 *
 * Compare with {@link ApiMethodSignature}, which represents a method belonging to an interface.
 * For example, a class method can be `static` but an interface method cannot.
 *
 * @public
 */
export declare class ApiMethod extends ApiMethod_base {
    constructor(options: IApiMethodOptions);
    static getContainerKey(name: string, isStatic: boolean, overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiMethod_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiTypeParameterListMixin) & (new (...args: any[]) => ApiStaticMixin) & (new (...args: any[]) => ApiReturnTypeMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiProtectedMixin) & (new (...args: any[]) => ApiParameterListMixin) & (new (...args: any[]) => ApiOptionalMixin) & (new (...args: any[]) => ApiAbstractMixin) & (new (...args: any[]) => ApiNameMixin);

/**
 * Represents a TypeScript member function declaration that belongs to an `ApiInterface`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiMethodSignature` represents a TypeScript declaration such as the `render` member function in this example:
 *
 * ```ts
 * export interface IWidget {
 *   render(): void;
 * }
 * ```
 *
 * Compare with {@link ApiMethod}, which represents a method belonging to a class.
 * For example, a class method can be `static` but an interface method cannot.
 *
 * @public
 */
export declare class ApiMethodSignature extends ApiMethodSignature_base {
    constructor(options: IApiMethodSignatureOptions);
    static getContainerKey(name: string, overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiMethodSignature_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiOptionalMixin) & (new (...args: any[]) => ApiReturnTypeMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiParameterListMixin) & (new (...args: any[]) => ApiTypeParameterListMixin) & (new (...args: any[]) => ApiNameMixin);

/**
 * A serializable representation of a collection of API declarations.
 *
 * @remarks
 *
 * An `ApiModel` represents a collection of API declarations that can be serialized to disk.  It captures all the
 * important information needed to generate documentation, without any reliance on the TypeScript compiler engine.
 *
 * An `ApiModel` acts as the root of a tree of objects that all inherit from the `ApiItem` base class.
 * The tree children are determined by the {@link (ApiItemContainerMixin:interface)} mixin base class.  The model
 * contains packages.  Packages have an entry point (today, only one).  And the entry point can contain various types
 * of API declarations.  The container relationships might look like this:
 *
 * ```
 * Things that can contain other things:
 *
 * - ApiModel
 *   - ApiPackage
 *     - ApiEntryPoint
 *       - ApiClass
 *         - ApiMethod
 *         - ApiProperty
 *       - ApiEnum
 *         - ApiEnumMember
 *       - ApiInterface
 *         - ApiMethodSignature
 *         - ApiPropertySignature
 *       - ApiNamespace
 *         - (ApiClass, ApiEnum, ApiInterace, ...)
 *
 * ```
 *
 * Normally, API Extractor writes an .api.json file to disk for each project that it builds.  Then, a tool like
 * API Documenter can load the various `ApiPackage` objects into a single `ApiModel` and process them as a group.
 * This is useful because compilation generally occurs separately (e.g. because projects may reside in different
 * Git repos, or because they build with different TypeScript compiler configurations that may be incompatible),
 * whereas API Documenter cannot detect broken hyperlinks without seeing the entire documentation set.
 *
 * @public
 */
export declare class ApiModel extends ApiModel_base {
    private readonly _resolver;
    private _packagesByName;
    private _apiItemsByCanonicalReference;
    constructor();
    loadPackage(apiJsonFilename: string): ApiPackage;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    get packages(): ReadonlyArray<ApiPackage>;
    /** @override */
    addMember(member: ApiPackage): void;
    /**
     * Efficiently finds a package by the NPM package name.
     *
     * @remarks
     *
     * If the NPM scope is omitted in the package name, it will still be found provided that it is an unambiguous match.
     * For example, it's often convenient to write `{@link node-core-library#JsonFile}` instead of
     * `{@link @rushstack/node-core-library#JsonFile}`.
     */
    tryGetPackageByName(packageName: string): ApiPackage | undefined;
    resolveDeclarationReference(declarationReference: DocDeclarationReference | DeclarationReference, contextApiItem: ApiItem | undefined): IResolveDeclarationReferenceResult;
    private _initApiItemsRecursive;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiModel_base: typeof ApiItem & (new (...args: any[]) => ApiItemContainerMixin);

/**
 * Mixin function for {@link (ApiNameMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiNameMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiNameMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiNameMixin);

/**
 * The mixin base class for API items that have a name.  For example, a class has a name, but a class constructor
 * does not.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiNameMixin extends ApiItem {
    /**
     * The exported name of this API item.
     *
     * @remarks
     * Note that due tue type aliasing, the exported name may be different from the locally declared name.
     */
    readonly name: string;
    /** @override */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}

/**
 * Static members for {@link (ApiNameMixin:interface)}.
 * @public
 */
export declare namespace ApiNameMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiNameMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiNameMixin;
}

/**
 * Represents a TypeScript namespace declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiNamespace` represents a TypeScript declaration such `X` or `Y` in this example:
 *
 * ```ts
 * export namespace X {
 *   export namespace Y {
 *     export interface IWidget {
 *       render(): void;
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export declare class ApiNamespace extends ApiNamespace_base {
    constructor(options: IApiNamespaceOptions);
    static getContainerKey(name: string): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiNamespace_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);

/**
 * Mixin function for {@link (ApiOptionalMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiOptionalMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiOptionalMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiOptionalMixin);

/**
 * The mixin base class for API items that can be marked as optional by appending a `?` to them.
 * For example, a property of an interface can be optional.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiOptionalMixin extends ApiItem {
    /**
     * True if this is an optional property.
     * @remarks
     * For example:
     * ```ts
     * interface X {
     *   y: string;   // not optional
     *   z?: string;  // optional
     * }
     * ```
     */
    readonly isOptional: boolean;
    /** @override */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}

/**
 * Optional members for {@link (ApiOptionalMixin:interface)}.
 * @public
 */
export declare namespace ApiOptionalMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiOptionalMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiOptionalMixin;
}

/**
 * Represents an NPM package containing API declarations.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * @public
 */
export declare class ApiPackage extends ApiPackage_base {
    private readonly _tsdocConfiguration;
    private readonly _projectFolderUrl?;
    constructor(options: IApiPackageOptions);
    /** @override */
    static onDeserializeInto(options: Partial<IApiPackageOptions>, context: DeserializerContext, jsonObject: IApiPackageJson): void;
    static loadFromJsonFile(apiJsonFilename: string): ApiPackage;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    get entryPoints(): ReadonlyArray<ApiEntryPoint>;
    /**
     * The TSDoc configuration that was used when analyzing the API for this package.
     *
     * @remarks
     *
     * Normally this configuration is loaded from the project's tsdoc.json file.  It is stored
     * in the .api.json file so that doc comments can be parsed accurately when loading the file.
     */
    get tsdocConfiguration(): TSDocConfiguration;
    get projectFolderUrl(): string | undefined;
    /** @override */
    addMember(member: ApiEntryPoint): void;
    findEntryPointsByPath(importPath: string): ReadonlyArray<ApiEntryPoint>;
    saveToJsonFile(apiJsonFilename: string, options?: IApiPackageSaveOptions): void;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiPackage_base: typeof ApiDocumentedItem & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);

/**
 * Mixin function for {@link (ApiParameterListMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiParameterListMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiParameterListMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiParameterListMixin);

/**
 * The mixin base class for API items that can have function parameters (but not necessarily a return value).
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiParameterListMixin extends ApiItem {
    /**
     * When a function has multiple overloaded declarations, this one-based integer index can be used to uniquely
     * identify them.
     *
     * @remarks
     *
     * Consider this overloaded declaration:
     *
     * ```ts
     * export namespace Versioning {
     *   // TSDoc: Versioning.(addVersions:1)
     *   export function addVersions(x: number, y: number): number;
     *
     *   // TSDoc: Versioning.(addVersions:2)
     *   export function addVersions(x: string, y: string): string;
     *
     *   // (implementation)
     *   export function addVersions(x: number|string, y: number|string): number|string {
     *     // . . .
     *   }
     * }
     * ```
     *
     * In the above example, there are two overloaded declarations.  The overload using numbers will have
     * `overloadIndex = 1`.  The overload using strings will have `overloadIndex = 2`.  The third declaration that
     * accepts all possible inputs is considered part of the implementation, and is not processed by API Extractor.
     */
    readonly overloadIndex: number;
    /**
     * The function parameters.
     */
    readonly parameters: ReadonlyArray<Parameter>;
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}

/**
 * Static members for {@link (ApiParameterListMixin:interface)}.
 * @public
 */
export declare namespace ApiParameterListMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiParameterListMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiParameterListMixin;
}

/**
 * Represents a TypeScript property declaration that belongs to an `ApiClass`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiProperty` represents a TypeScript declaration such as the `width` and `height` members in this example:
 *
 * ```ts
 * export class Widget {
 *   public width: number = 100;
 *
 *   public get height(): number {
 *     if (this.isSquashed()) {
 *       return 0;
 *     } else {
 *       return this.clientArea.height;
 *     }
 *   }
 * }
 * ```
 *
 * Note that member variables are also considered to be properties.
 *
 * If the property has both a getter function and setter function, they will be represented by a single `ApiProperty`
 * and must have a single documentation comment.
 *
 * Compare with {@link ApiPropertySignature}, which represents a property belonging to an interface.
 * For example, a class property can be `static` but an interface property cannot.
 *
 * @public
 */
export declare class ApiProperty extends ApiProperty_base {
    constructor(options: IApiPropertyOptions);
    static getContainerKey(name: string, isStatic: boolean): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiProperty_base: typeof ApiPropertyItem & (new (...args: any[]) => ApiInitializerMixin) & (new (...args: any[]) => ApiStaticMixin) & (new (...args: any[]) => ApiProtectedMixin) & (new (...args: any[]) => ApiAbstractMixin);

/**
 * The abstract base class for {@link ApiProperty} and {@link ApiPropertySignature}.
 *
 * @public
 */
export declare class ApiPropertyItem extends ApiPropertyItem_base {
    /**
     * An {@link Excerpt} that describes the type of the property.
     */
    readonly propertyTypeExcerpt: Excerpt;
    constructor(options: IApiPropertyItemOptions);
    /** @override */
    static onDeserializeInto(options: Partial<IApiPropertyItemOptions>, context: DeserializerContext, jsonObject: IApiPropertyItemJson): void;
    /**
     * Returns true if this property should be documented as an event.
     *
     * @remarks
     * The `@eventProperty` TSDoc modifier can be added to readonly properties to indicate that they return an
     * event object that event handlers can be attached to.  The event-handling API is implementation-defined, but
     * typically the return type would be a class with members such as `addHandler()` and `removeHandler()`.
     * The documentation should display such properties under an "Events" heading instead of the
     * usual "Properties" heading.
     */
    get isEventProperty(): boolean;
    /** @override */
    serializeInto(jsonObject: Partial<IApiPropertyItemJson>): void;
}

declare const ApiPropertyItem_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiReadonlyMixin) & (new (...args: any[]) => ApiOptionalMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin);

/**
 * Represents a TypeScript property declaration that belongs to an `ApiInterface`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiPropertySignature` represents a TypeScript declaration such as the `width` and `height` members in this example:
 *
 * ```ts
 * export interface IWidget {
 *   readonly width: number;
 *   height: number;
 * }
 * ```
 *
 * Compare with {@link ApiProperty}, which represents a property belonging to a class.
 * For example, a class property can be `static` but an interface property cannot.
 *
 * @public
 */
export declare class ApiPropertySignature extends ApiPropertyItem {
    constructor(options: IApiPropertySignatureOptions);
    static getContainerKey(name: string): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

/**
 * Mixin function for {@link (ApiProtectedMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiProtectedMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiProtectedMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiProtectedMixin);

/**
 * The mixin base class for API items that can have the TypeScript `protected` keyword applied to them.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiProtectedMixin extends ApiItem {
    /**
     * Whether the declaration has the TypeScript `protected` keyword.
     */
    readonly isProtected: boolean;
    /** @override */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}

/**
 * Static members for {@link (ApiProtectedMixin:interface)}.
 * @public
 */
export declare namespace ApiProtectedMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiProtectedMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiProtectedMixin;
}

/**
 * Mixin function for {@link (ApiReadonlyMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiReadonlyMixin:interface)}
 * functionality.
 *
 * @public
 */
export declare function ApiReadonlyMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiReadonlyMixin);

/**
 * The mixin base class for API items that cannot be modified after instantiation.
 * Examples such as the readonly modifier and only having a getter but no setter.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiReadonlyMixin extends ApiItem {
    /**
     * Indicates that the API item's value cannot be assigned by an external consumer.
     *
     * @remarks
     * Examples of API items that would be considered "read only" by API Extractor:
     *
     * - A class or interface's property that has the `readonly` modifier.
     *
     * - A variable that has the `const` modifier.
     *
     * - A property or variable whose TSDoc comment includes the `@readonly` tag.
     *
     * - A property declaration with a getter but no setter.
     *
     * Note that if the `readonly` keyword appears in a type annotation, this does not
     * guarantee that that the API item will be considered readonly. For example:
     *
     * ```ts
     * declare class C {
     *   // isReadonly=false in this case, because C.x is assignable
     *   public x: readonly string[];
     * }
     * ```
     */
    readonly isReadonly: boolean;
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}

/**
 * Static members for {@link (ApiReadonlyMixin:interface)}.
 * @public
 */
export declare namespace ApiReadonlyMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiReadonlyMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiReadonlyMixin;
}

/**
 * Mixin function for {@link (ApiReleaseTagMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiReleaseTagMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiReleaseTagMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiReleaseTagMixin);

/**
 * The mixin base class for API items that can be attributed with a TSDoc tag such as `@internal`,
 * `@alpha`, `@beta`, or `@public`.  These "release tags" indicate the support level for an API.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiReleaseTagMixin extends ApiItem {
    /**
     * The effective release tag for this declaration.  If it is not explicitly specified, the value may be
     * inherited from a containing declaration.
     *
     * @remarks
     * For example, an `ApiEnumMember` may inherit its release tag from the containing `ApiEnum`.
     */
    readonly releaseTag: ReleaseTag;
    /** @override */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}

/**
 * Static members for {@link (ApiReleaseTagMixin:interface)}.
 * @public
 */
export declare namespace ApiReleaseTagMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiReleaseTagMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiReleaseTagMixin;
}

/**
 * Mixin function for {@link (ApiReturnTypeMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiReturnTypeMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiReturnTypeMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiReturnTypeMixin);

/**
 * The mixin base class for API items that are functions that return a value.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiReturnTypeMixin extends ApiItem {
    /**
     * An {@link Excerpt} that describes the type of the function's return value.
     */
    readonly returnTypeExcerpt: Excerpt;
    /** @override */
    serializeInto(jsonObject: Partial<IApiReturnTypeMixinJson>): void;
}

/**
 * Static members for {@link (ApiReturnTypeMixin:interface)}.
 * @public
 */
export declare namespace ApiReturnTypeMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiReturnTypeMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiReturnTypeMixin;
}

/**
 * Mixin function for {@link (ApiStaticMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiStaticMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiStaticMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiStaticMixin);

/**
 * The mixin base class for API items that can have the TypeScript `static` keyword applied to them.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiStaticMixin extends ApiItem {
    /**
     * Whether the declaration has the TypeScript `static` keyword.
     */
    readonly isStatic: boolean;
    /** @override */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}

/**
 * Static members for {@link (ApiStaticMixin:interface)}.
 * @public
 */
export declare namespace ApiStaticMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiStaticMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiStaticMixin;
}

/**
 * Represents a TypeScript type alias declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiTypeAlias` represents a definition such as one of these examples:
 *
 * ```ts
 * // A union type:
 * export type Shape = Square | Triangle | Circle;
 *
 * // A generic type alias:
 * export type BoxedValue<T> = { value: T };
 *
 * export type BoxedArray<T> = { array: T[] };
 *
 * // A conditional type alias:
 * export type Boxed<T> = T extends any[] ? BoxedArray<T[number]> : BoxedValue<T>;
 *
 * ```
 *
 * @public
 */
export declare class ApiTypeAlias extends ApiTypeAlias_base {
    /**
     * An {@link Excerpt} that describes the type of the alias.
     *
     * @remarks
     * In the example below, the `typeExcerpt` would correspond to the subexpression
     * `T extends any[] ? BoxedArray<T[number]> : BoxedValue<T>;`:
     *
     * ```ts
     * export type Boxed<T> = T extends any[] ? BoxedArray<T[number]> : BoxedValue<T>;
     * ```
     */
    readonly typeExcerpt: Excerpt;
    constructor(options: IApiTypeAliasOptions);
    /** @override */
    static onDeserializeInto(options: Partial<IApiTypeAliasOptions>, context: DeserializerContext, jsonObject: IApiTypeAliasJson): void;
    static getContainerKey(name: string): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @override */
    serializeInto(jsonObject: Partial<IApiTypeAliasJson>): void;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}

declare const ApiTypeAlias_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiTypeParameterListMixin);

/**
 * Mixin function for {@link (ApiTypeParameterListMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiTypeParameterListMixin:interface)}
 * functionality.
 *
 * @public
 */
export declare function ApiTypeParameterListMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiTypeParameterListMixin);

/**
 * The mixin base class for API items that can have type parameters.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export declare interface ApiTypeParameterListMixin extends ApiItem {
    /**
     * The type parameters.
     */
    readonly typeParameters: ReadonlyArray<TypeParameter>;
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}

/**
 * Static members for {@link (ApiTypeParameterListMixin:interface)}.
 * @public
 */
export declare namespace ApiTypeParameterListMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiParameterListMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    export function isBaseClassOf(apiItem: ApiItem): apiItem is ApiTypeParameterListMixin;
}

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

declare const ApiVariable_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiInitializerMixin) & (new (...args: any[]) => ApiReadonlyMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin);

/**
 * This abstraction is used by the mixin pattern.
 * It describes a class constructor.
 * @public
 */
export declare type Constructor<T = {}> = new (...args: any[]) => T;

declare class DeserializerContext {
    /**
     * The path of the file being deserialized, which may be useful for diagnostic purposes.
     */
    readonly apiJsonFilename: string;
    /**
     * Metadata from `IApiPackageMetadataJson.toolPackage`.
     */
    readonly toolPackage: string;
    /**
     * Metadata from `IApiPackageMetadataJson.toolVersion`.
     */
    readonly toolVersion: string;
    /**
     * The version of the schema being deserialized, as obtained from `IApiPackageMetadataJson.schemaVersion`.
     */
    readonly versionToDeserialize: ApiJsonSchemaVersion;
    /**
     * The TSDoc configuration for the context.
     */
    readonly tsdocConfiguration: TSDocConfiguration;
    constructor(options: DeserializerContext);
}

/**
 * Options for customizing the sort order of {@link ApiEnum} members.
 *
 * @privateRemarks
 * This enum is currently only used by the `@microsoft/api-extractor` package; it is declared here
 * because we anticipate that if more options are added in the future, their sorting will be implemented
 * by the `@microsoft/api-extractor-model` package.
 *
 * See https://github.com/microsoft/rushstack/issues/918 for details.
 *
 * @public
 */
export declare enum EnumMemberOrder {
    /**
     * `ApiEnumMember` items are sorted according to their {@link ApiItem.getSortKey}.  The order is
     * basically alphabetical by identifier name, but otherwise unspecified to allow for cosmetic improvements.
     *
     * This is the default behavior.
     */
    ByName = "by-name",
    /**
     * `ApiEnumMember` items preserve the original order of the declarations in the source file.
     * (This disables the automatic sorting that is normally applied based on {@link ApiItem.getSortKey}.)
     */
    Preserve = "preserve"
}

/**
 * The `Excerpt` class is used by {@link ApiDeclaredItem} to represent a TypeScript code fragment that may be
 * annotated with hyperlinks to declared types (and in the future, source code locations).
 *
 * @remarks
 * API Extractor's .api.json file format stores excerpts compactly as a start/end indexes into an array of tokens.
 * Every `ApiDeclaredItem` has a "main excerpt" corresponding to the full list of tokens.  The declaration may
 * also have have "captured" excerpts that correspond to subranges of tokens.
 *
 * For example, if the main excerpt is:
 *
 * ```
 * function parse(s: string): Vector | undefined;
 * ```
 *
 * ...then this entire signature is the "main excerpt", whereas the function's return type `Vector | undefined` is a
 * captured excerpt.  The `Vector` token might be a hyperlink to that API item.
 *
 * An excerpt may be empty (i.e. a token range containing zero tokens).  For example, if a function's return value
 * is not explicitly declared, then the returnTypeExcerpt will be empty.  By contrast, a class constructor cannot
 * have a return value, so ApiConstructor has no returnTypeExcerpt property at all.
 *
 * @public
 */
export declare class Excerpt {
    /**
     * The complete list of tokens for the source code fragment that this excerpt is based upon.
     * If this object is the main excerpt, then it will span all of the tokens; otherwise, it will correspond to
     * a range within the array.
     */
    readonly tokens: ReadonlyArray<ExcerptToken>;
    /**
     * Specifies the excerpt's range within the `tokens` array.
     */
    readonly tokenRange: Readonly<IExcerptTokenRange>;
    /**
     * The tokens spanned by this excerpt.  It is the range of the `tokens` array as specified by the `tokenRange`
     * property.
     */
    readonly spannedTokens: ReadonlyArray<ExcerptToken>;
    private _text;
    constructor(tokens: ReadonlyArray<ExcerptToken>, tokenRange: IExcerptTokenRange);
    /**
     * The excerpted text, formed by concatenating the text of the `spannedTokens` strings.
     */
    get text(): string;
    /**
     * Returns true if the excerpt is an empty range.
     */
    get isEmpty(): boolean;
}

/**
 * Represents a fragment of text belonging to an {@link Excerpt} object.
 *
 * @public
 */
export declare class ExcerptToken {
    private readonly _kind;
    private readonly _text;
    private readonly _canonicalReference;
    constructor(kind: ExcerptTokenKind, text: string, canonicalReference?: DeclarationReference);
    /**
     * Indicates the kind of token.
     */
    get kind(): ExcerptTokenKind;
    /**
     * The text fragment.
     */
    get text(): string;
    /**
     * The hyperlink target for a token whose type is `ExcerptTokenKind.Reference`.  For other token types,
     * this property will be `undefined`.
     */
    get canonicalReference(): DeclarationReference | undefined;
}

/** @public */
export declare enum ExcerptTokenKind {
    /**
     * Generic text without any special properties
     */
    Content = "Content",
    /**
     * A reference to an API declaration
     */
    Reference = "Reference"
}

/**
 * Unique identifiers for messages returned as part of `IFindApiItemsResult`.
 * @public
 */
export declare enum FindApiItemsMessageId {
    /**
     * "Unable to resolve declaration reference within API item ___: ___"
     */
    DeclarationResolutionFailed = "declaration-resolution-failed",
    /**
     * "Unable to analyze extends clause ___ of API item ___ because no canonical reference was found."
     */
    ExtendsClauseMissingReference = "extends-clause-missing-reference",
    /**
     * "Unable to analyze references of API item ___ because it is not associated with an ApiModel"
     */
    NoAssociatedApiModel = "no-associated-api-model",
    /**
     * "Unable to analyze references of API item ___ because it is of unsupported kind ___"
     */
    UnsupportedKind = "unsupported-kind"
}

/**
 * Represents a type referenced via an "extends" or "implements" heritage clause for a TypeScript class
 * or interface.
 *
 * @remarks
 *
 * For example, consider this declaration:
 *
 * ```ts
 * export class Widget extends Controls.WidgetBase implements Controls.IWidget, IDisposable {
 *   // . . .
 * }
 * ```
 *
 * The heritage types are `Controls.WidgetBase`, `Controls.IWidget`, and `IDisposable`.
 * @public
 */
export declare class HeritageType {
    /**
     * An excerpt corresponding to the referenced type.
     * @remarks
     *
     * For example, consider this declaration:
     *
     * ```ts
     * export class Widget extends Controls.WidgetBase implements Controls.IWidget, IDisposable {
     *   // . . .
     * }
     * ```
     *
     * The excerpt might be `Controls.WidgetBase`, `Controls.IWidget`, or `IDisposable`.
     */
    readonly excerpt: Excerpt;
    constructor(excerpt: Excerpt);
}

declare interface IApiAbstractMixinJson extends IApiItemJson {
    isAbstract: boolean;
}

/**
 * Constructor options for {@link (ApiAbstractMixin:interface)}.
 * @public
 */
export declare interface IApiAbstractMixinOptions extends IApiItemOptions {
    isAbstract: boolean;
}

/**
 * Constructor options for {@link ApiCallSignature}.
 * @public
 */
export declare interface IApiCallSignatureOptions extends IApiTypeParameterListMixinOptions, IApiParameterListMixinOptions, IApiReleaseTagMixinOptions, IApiReturnTypeMixinOptions, IApiDeclaredItemOptions {
}

declare interface IApiClassJson extends IApiDeclaredItemJson, IApiAbstractMixinJson, IApiTypeParameterListMixinJson, IApiExportedMixinJson {
    extendsTokenRange?: IExcerptTokenRange;
    implementsTokenRanges: IExcerptTokenRange[];
}

/**
 * Constructor options for {@link ApiClass}.
 * @public
 */
export declare interface IApiClassOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions, IApiAbstractMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiTypeParameterListMixinOptions, IApiExportedMixinOptions {
    extendsTokenRange: IExcerptTokenRange | undefined;
    implementsTokenRanges: IExcerptTokenRange[];
}

/**
 * Constructor options for {@link ApiConstructor}.
 * @public
 */
export declare interface IApiConstructorOptions extends IApiParameterListMixinOptions, IApiProtectedMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions {
}

/**
 * Constructor options for {@link ApiConstructor}.
 * @public
 */
export declare interface IApiConstructSignatureOptions extends IApiTypeParameterListMixinOptions, IApiParameterListMixinOptions, IApiReleaseTagMixinOptions, IApiReturnTypeMixinOptions, IApiDeclaredItemOptions {
}

declare interface IApiDeclaredItemJson extends IApiDocumentedItemJson {
    excerptTokens: IExcerptToken[];
    fileUrlPath?: string;
}

/**
 * Constructor options for {@link ApiDeclaredItem}.
 * @public
 */
export declare interface IApiDeclaredItemOptions extends IApiDocumentedItemOptions {
    excerptTokens: IExcerptToken[];
    fileUrlPath?: string;
}

declare interface IApiDocumentedItemJson extends IApiItemJson {
    docComment: string;
}

/**
 * Constructor options for {@link ApiDocumentedItem}.
 * @public
 */
export declare interface IApiDocumentedItemOptions extends IApiItemOptions {
    docComment: tsdoc.DocComment | undefined;
}

/**
 * Constructor options for {@link ApiEntryPoint}.
 * @public
 */
export declare interface IApiEntryPointOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions {
}

/**
 * Constructor options for {@link ApiEnumMember}.
 * @public
 */
export declare interface IApiEnumMemberOptions extends IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiInitializerMixinOptions {
}

/**
 * Constructor options for {@link ApiEnum}.
 * @public
 */
export declare interface IApiEnumOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiExportedMixinOptions {
}

declare interface IApiExportedMixinJson extends IApiItemJson {
    isExported: boolean;
}

/**
 * Constructor options for {@link (IApiExportedMixinOptions:interface)}.
 * @public
 */
export declare interface IApiExportedMixinOptions extends IApiItemOptions {
    isExported: boolean;
}

/**
 * Constructor options for {@link ApiFunction}.
 * @public
 */
export declare interface IApiFunctionOptions extends IApiNameMixinOptions, IApiTypeParameterListMixinOptions, IApiParameterListMixinOptions, IApiReleaseTagMixinOptions, IApiReturnTypeMixinOptions, IApiDeclaredItemOptions, IApiExportedMixinOptions {
}

/**
 * Constructor options for {@link ApiIndexSignature}.
 * @public
 */
export declare interface IApiIndexSignatureOptions extends IApiParameterListMixinOptions, IApiReleaseTagMixinOptions, IApiReturnTypeMixinOptions, IApiReadonlyMixinOptions, IApiDeclaredItemOptions {
}

declare interface IApiInitializerMixinJson extends IApiItemJson {
    initializerTokenRange?: IExcerptTokenRange;
}

/**
 * Constructor options for {@link (IApiInitializerMixinOptions:interface)}.
 * @public
 */
export declare interface IApiInitializerMixinOptions extends IApiItemOptions {
    initializerTokenRange?: IExcerptTokenRange;
}

declare interface IApiInterfaceJson extends IApiItemContainerJson, IApiNameMixinJson, IApiTypeParameterListMixinJson, IApiReleaseTagMixinJson, IApiDeclaredItemJson, IApiExportedMixinJson {
    extendsTokenRanges: IExcerptTokenRange[];
}

/**
 * Constructor options for {@link ApiInterface}.
 * @public
 */
export declare interface IApiInterfaceOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions, IApiTypeParameterListMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiExportedMixinOptions {
    extendsTokenRanges: IExcerptTokenRange[];
}

/**
 * This abstraction is used by the mixin pattern.
 * It describes a class type that inherits from {@link ApiItem}.
 *
 * @public
 */
export declare interface IApiItemConstructor extends Constructor<ApiItem>, PropertiesOf<typeof ApiItem> {
}

declare interface IApiItemContainerJson extends IApiItemJson {
    preserveMemberOrder?: boolean;
    members: IApiItemJson[];
}

/**
 * Constructor options for {@link (ApiItemContainerMixin:interface)}.
 * @public
 */
export declare interface IApiItemContainerMixinOptions extends IApiItemOptions {
    preserveMemberOrder?: boolean;
    members?: ApiItem[];
}

declare interface IApiItemJson {
    kind: ApiItemKind;
    canonicalReference: string;
}

/**
 * Constructor options for {@link ApiItem}.
 * @public
 */
export declare interface IApiItemOptions {
}

/**
 * Constructor options for {@link ApiMethod}.
 * @public
 */
export declare interface IApiMethodOptions extends IApiNameMixinOptions, IApiAbstractMixinOptions, IApiOptionalMixinOptions, IApiParameterListMixinOptions, IApiProtectedMixinOptions, IApiReleaseTagMixinOptions, IApiReturnTypeMixinOptions, IApiStaticMixinOptions, IApiTypeParameterListMixinOptions, IApiDeclaredItemOptions {
}

/** @public */
export declare interface IApiMethodSignatureOptions extends IApiNameMixinOptions, IApiTypeParameterListMixinOptions, IApiParameterListMixinOptions, IApiReleaseTagMixinOptions, IApiReturnTypeMixinOptions, IApiOptionalMixinOptions, IApiDeclaredItemOptions {
}

declare interface IApiNameMixinJson extends IApiItemJson {
    name: string;
}

/**
 * Constructor options for {@link (IApiNameMixinOptions:interface)}.
 * @public
 */
export declare interface IApiNameMixinOptions extends IApiItemOptions {
    name: string;
}

/**
 * Constructor options for {@link ApiClass}.
 * @public
 */
export declare interface IApiNamespaceOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiExportedMixinOptions {
}

/**
 * Constructor options for {@link (IApiOptionalMixinOptions:interface)}.
 * @public
 */
export declare interface IApiOptionalMixinOptions extends IApiItemOptions {
    isOptional: boolean;
}

declare interface IApiPackageJson extends IApiItemJson {
    /**
     * A file header that stores metadata about the tool that wrote the *.api.json file.
     */
    metadata: IApiPackageMetadataJson;
    /**
     * The base URL where the project's source code can be viewed on a website such as GitHub or
     * Azure DevOps. This URL path corresponds to the `<projectFolder>` path on disk. Provided via the
     * `api-extractor.json` config.
     */
    projectFolderUrl?: string;
}

declare interface IApiPackageMetadataJson {
    /**
     * The NPM package name for the tool that wrote the *.api.json file.
     * For informational purposes only.
     */
    toolPackage: string;
    /**
     * The NPM package version for the tool that wrote the *.api.json file.
     * For informational purposes only.
     */
    toolVersion: string;
    /**
     * The schema version for the .api.json file format.  Used for determining whether the file format is
     * supported, and for backwards compatibility.
     */
    schemaVersion: ApiJsonSchemaVersion;
    /**
     * To support forwards compatibility, the `oldestForwardsCompatibleVersion` field tracks the oldest schema version
     * whose corresponding deserializer could safely load this file.
     *
     * @remarks
     * Normally api-extractor-model should refuse to load a schema version that is newer than the latest version
     * that its deserializer understands.  However, sometimes a schema change may merely introduce some new fields
     * without modifying or removing any existing fields.  In this case, an older api-extractor-model library can
     * safely deserialize the newer version (by ignoring the extra fields that it doesn't recognize).  The newer
     * serializer can use this field to communicate that.
     *
     * If present, the `oldestForwardsCompatibleVersion` must be less than or equal to
     * `IApiPackageMetadataJson.schemaVersion`.
     */
    oldestForwardsCompatibleVersion?: ApiJsonSchemaVersion;
    /**
     * The TSDoc configuration that was used when analyzing the API for this package.
     *
     * @remarks
     *
     * The structure of this objet is defined by the `@microsoft/tsdoc-config` library.
     * Normally this configuration is loaded from the project's tsdoc.json file.  It is stored
     * in the .api.json file so that doc comments can be parsed accurately when loading the file.
     */
    tsdocConfig: JsonObject;
}

/**
 * Constructor options for {@link ApiPackage}.
 * @public
 */
export declare interface IApiPackageOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions, IApiDocumentedItemOptions {
    tsdocConfiguration: TSDocConfiguration;
    projectFolderUrl?: string;
}

/**
 * Options for {@link ApiPackage.saveToJsonFile}.
 * @public
 */
export declare interface IApiPackageSaveOptions extends IJsonFileSaveOptions {
    /**
     * Optionally specifies a value for the "toolPackage" field in the output .api.json data file;
     * otherwise, the value will be "api-extractor-model".
     */
    toolPackage?: string;
    /**
     * Optionally specifies a value for the "toolVersion" field in the output .api.json data file;
     * otherwise, the value will be the current version of the api-extractor-model package.
     */
    toolVersion?: string;
    /**
     * Set to true only when invoking API Extractor's test harness.
     *
     * @remarks
     * When `testMode` is true, the `toolVersion` field in the .api.json file is assigned an empty string
     * to prevent spurious diffs in output files tracked for tests.
     */
    testMode?: boolean;
}

/**
 * Constructor options for {@link (ApiParameterListMixin:interface)}.
 * @public
 */
export declare interface IApiParameterListMixinOptions extends IApiItemOptions {
    overloadIndex: number;
    parameters: IApiParameterOptions[];
}

/**
 * Represents parameter information that is part of {@link IApiParameterListMixinOptions}
 * @public
 */
export declare interface IApiParameterOptions {
    parameterName: string;
    parameterTypeTokenRange: IExcerptTokenRange;
    isOptional: boolean;
}

declare interface IApiPropertyItemJson extends IApiDeclaredItemJson {
    propertyTypeTokenRange: IExcerptTokenRange;
}

/**
 * Constructor options for {@link ApiPropertyItem}.
 * @public
 */
export declare interface IApiPropertyItemOptions extends IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiOptionalMixinOptions, IApiReadonlyMixinOptions, IApiDeclaredItemOptions {
    propertyTypeTokenRange: IExcerptTokenRange;
}

/**
 * Constructor options for {@link ApiProperty}.
 * @public
 */
export declare interface IApiPropertyOptions extends IApiPropertyItemOptions, IApiAbstractMixinOptions, IApiProtectedMixinOptions, IApiStaticMixinOptions, IApiInitializerMixinOptions {
}

/**
 * Constructor options for {@link ApiPropertySignature}.
 * @public
 */
export declare interface IApiPropertySignatureOptions extends IApiPropertyItemOptions {
}

/**
 * Constructor options for {@link (IApiProtectedMixinOptions:interface)}.
 * @public
 */
export declare interface IApiProtectedMixinOptions extends IApiItemOptions {
    isProtected: boolean;
}

/**
 * Constructor options for {@link (ApiReadonlyMixin:interface)}.
 * @public
 */
export declare interface IApiReadonlyMixinOptions extends IApiItemOptions {
    isReadonly: boolean;
}

declare interface IApiReleaseTagMixinJson extends IApiItemJson {
    releaseTag: string;
}

/**
 * Constructor options for {@link (ApiReleaseTagMixin:interface)}.
 * @public
 */
export declare interface IApiReleaseTagMixinOptions extends IApiItemOptions {
    releaseTag: ReleaseTag;
}

declare interface IApiReturnTypeMixinJson extends IApiItemJson {
    returnTypeTokenRange: IExcerptTokenRange;
}

/**
 * Constructor options for {@link (ApiReturnTypeMixin:interface)}.
 * @public
 */
export declare interface IApiReturnTypeMixinOptions extends IApiItemOptions {
    returnTypeTokenRange: IExcerptTokenRange;
}

/**
 * Constructor options for {@link (IApiStaticMixinOptions:interface)}.
 * @public
 */
export declare interface IApiStaticMixinOptions extends IApiItemOptions {
    isStatic: boolean;
}

declare interface IApiTypeAliasJson extends IApiDeclaredItemJson, IApiTypeParameterListMixinJson, IApiExportedMixinJson {
    typeTokenRange: IExcerptTokenRange;
}

/**
 * Constructor options for {@link ApiTypeAlias}.
 * @public
 */
export declare interface IApiTypeAliasOptions extends IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiTypeParameterListMixinOptions, IApiExportedMixinOptions {
    typeTokenRange: IExcerptTokenRange;
}

declare interface IApiTypeParameterListMixinJson extends IApiItemJson {
    typeParameters: IApiTypeParameterOptions[];
}

/**
 * Constructor options for {@link (ApiTypeParameterListMixin:interface)}.
 * @public
 */
export declare interface IApiTypeParameterListMixinOptions extends IApiItemOptions {
    typeParameters: IApiTypeParameterOptions[];
}

/**
 * Represents parameter information that is part of {@link IApiTypeParameterListMixinOptions}
 * @public
 */
export declare interface IApiTypeParameterOptions {
    typeParameterName: string;
    constraintTokenRange: IExcerptTokenRange;
    defaultTypeTokenRange: IExcerptTokenRange;
}

declare interface IApiVariableJson extends IApiDeclaredItemJson, IApiExportedMixinJson {
    variableTypeTokenRange: IExcerptTokenRange;
}

/**
 * Constructor options for {@link ApiVariable}.
 * @public
 */
export declare interface IApiVariableOptions extends IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiReadonlyMixinOptions, IApiDeclaredItemOptions, IApiInitializerMixinOptions, IApiExportedMixinOptions {
    variableTypeTokenRange: IExcerptTokenRange;
}

/** @public */
export declare interface IExcerptToken {
    readonly kind: ExcerptTokenKind;
    text: string;
    canonicalReference?: string;
}

/**
 * Used by {@link Excerpt} to indicate a range of indexes within an array of `ExcerptToken` objects.
 *
 * @public
 */
export declare interface IExcerptTokenRange {
    /**
     * The starting index of the span.
     */
    startIndex: number;
    /**
     * The index of the last member of the span, plus one.
     *
     * @remarks
     *
     * If `startIndex` and `endIndex` are the same number, then the span is empty.
     */
    endIndex: number;
}

/**
 * This object is used for messages returned as part of `IFindApiItemsResult`.
 * @public
 */
export declare interface IFindApiItemsMessage {
    /**
     * Unique identifier for the message.
     * @beta
     */
    messageId: FindApiItemsMessageId;
    /**
     * Text description of the message.
     */
    text: string;
}

/**
 * Generic result object for finding API items used by different kinds of find operations.
 * @public
 */
export declare interface IFindApiItemsResult {
    /**
     * The API items that were found. Not guaranteed to be complete, see `maybeIncompleteResult`.
     */
    items: ApiItem[];
    /**
     * Diagnostic messages regarding the find operation.
     */
    messages: IFindApiItemsMessage[];
    /**
     * Indicates whether the result is potentially incomplete due to errors during the find operation.
     * If true, the `messages` explain the errors in more detail.
     */
    maybeIncompleteResult: boolean;
}

/**
 * Constructor options for {@link Parameter}.
 * @public
 */
export declare interface IParameterOptions {
    name: string;
    parameterTypeExcerpt: Excerpt;
    isOptional: boolean;
    parent: ApiParameterListMixin;
}

/**
 * Result object for {@link ApiModel.resolveDeclarationReference}.
 *
 * @public
 */
export declare interface IResolveDeclarationReferenceResult {
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
 * Constructor options for `SourceLocation`.
 * @public
 */
export declare interface ISourceLocationOptions {
    /**
     * The project folder URL as defined by the `api-extractor.json` config `projectFolderUrl`
     * setting.
     */
    projectFolderUrl?: string;
    /**
     * The file URL path relative to the `projectFolder` and `projectFolderURL` fields as
     * defined in the `api-extractor.json` config.
     */
    fileUrlPath?: string;
}

/**
 * Constructor options for {@link TypeParameter}.
 * @public
 */
export declare interface ITypeParameterOptions {
    name: string;
    constraintExcerpt: Excerpt;
    defaultTypeExcerpt: Excerpt;
    isOptional: boolean;
    parent: ApiTypeParameterListMixin;
}

/**
 * Represents a named parameter for a function-like declaration.
 *
 * @remarks
 *
 * `Parameter` represents a TypeScript declaration such as `x: number` in this example:
 *
 * ```ts
 * export function add(x: number, y: number): number {
 *   return x + y;
 * }
 * ```
 *
 * `Parameter` objects belong to the {@link (ApiParameterListMixin:interface).parameters} collection.
 *
 * @public
 */
export declare class Parameter {
    /**
     * An {@link Excerpt} that describes the type of the parameter.
     */
    readonly parameterTypeExcerpt: Excerpt;
    /**
     * The parameter name.
     */
    name: string;
    /**
     * Whether the parameter is optional.
     */
    isOptional: boolean;
    private _parent;
    constructor(options: IParameterOptions);
    /**
     * Returns the `@param` documentation for this parameter, if present.
     */
    get tsdocParamBlock(): tsdoc.DocParamBlock | undefined;
}

/**
 * This abstraction is used by the mixin pattern.
 * It describes the "static side" of a class.
 *
 * @public
 */
export declare type PropertiesOf<T> = {
    [K in keyof T]: T[K];
};

/**
 * A "release tag" is a custom TSDoc tag that is applied to an API to communicate the level of support
 * provided for third-party developers.
 *
 * @remarks
 *
 * The four release tags are: `@internal`, `@alpha`, `@beta`, and `@public`. They are applied to API items such
 * as classes, member functions, enums, etc.  The release tag applies recursively to members of a container
 * (e.g. class or interface). For example, if a class is marked as `@beta`, then all of its members automatically
 * have this status; you DON'T need add the `@beta` tag to each member function. However, you could add
 * `@internal` to a member function to give it a different release status.
 *
 * @public
 */
export declare enum ReleaseTag {
    /**
     * No release tag was specified in the AEDoc summary.
     */
    None = 0,
    /**
     * Indicates that an API item is meant only for usage by other NPM packages from the same
     * maintainer. Third parties should never use "internal" APIs. (To emphasize this, their
     * names are prefixed by underscores.)
     */
    Internal = 1,
    /**
     * Indicates that an API item is eventually intended to be public, but currently is in an
     * early stage of development. Third parties should not use "alpha" APIs.
     */
    Alpha = 2,
    /**
     * Indicates that an API item has been released in an experimental state. Third parties are
     * encouraged to try it and provide feedback. However, a "beta" API should NOT be used
     * in production.
     */
    Beta = 3,
    /**
     * Indicates that an API item has been officially released. It is part of the supported
     * contract (e.g. SemVer) for a package.
     */
    Public = 4
}

/**
 * Helper functions for working with the `ReleaseTag` enum.
 * @public
 */
export declare namespace ReleaseTag {
    /**
     * Returns the TSDoc tag name for a `ReleaseTag` value.
     *
     * @remarks
     * For example, `getTagName(ReleaseTag.Internal)` would return the string `@internal`.
     */
    export function getTagName(releaseTag: ReleaseTag): string;
    /**
     * Compares two `ReleaseTag` values. Their values must not be `ReleaseTag.None`.
     * @returns 0 if `a` and `b` are equal, a positive number if `a` is more public than `b`,
     * and a negative number if `a` is less public than `b`.
     * @remarks
     * For example, `compareReleaseTag(ReleaseTag.Beta, ReleaseTag.Alpha)` will return a positive
     * number because beta is more public than alpha.
     */
    export function compare(a: ReleaseTag, b: ReleaseTag): number;
}

/**
 * The source location where a given API item is declared.
 *
 * @remarks
 * The source location points to the `.ts` source file where the API item was originally
 declared. However, in some cases, if source map resolution fails, it falls back to pointing
 to the `.d.ts` file instead.
 *
 * @public
 */
export declare class SourceLocation {
    private readonly _projectFolderUrl?;
    private readonly _fileUrlPath?;
    constructor(options: ISourceLocationOptions);
    /**
     * Returns the file URL to the given source location. Returns `undefined` if the file URL
     * cannot be determined.
     */
    get fileUrl(): string | undefined;
}

/**
 * Represents a named type parameter for a generic declaration.
 *
 * @remarks
 *
 * `TypeParameter` represents a TypeScript declaration such as `T` in this example:
 *
 * ```ts
 * interface IIdentifier {
 *     getCode(): string;
 * }
 *
 * class BarCode implements IIdentifier {
 *     private _value: number;
 *     public getCode(): string { return this._value.toString(); }
 * }
 *
 * class Book<TIdentifier extends IIdentifier = BarCode> {
 *     public identifier: TIdentifier;
 * }
 * ```
 *
 * `TypeParameter` objects belong to the {@link (ApiTypeParameterListMixin:interface).typeParameters} collection.
 *
 * @public
 */
export declare class TypeParameter {
    /**
     * An {@link Excerpt} that describes the base constraint of the type parameter.
     *
     * @remarks
     * In the example below, the `constraintExcerpt` would correspond to the `IIdentifier` subexpression:
     *
     * ```ts
     * class Book<TIdentifier extends IIdentifier = BarCode> {
     *     public identifier: TIdentifier;
     * }
     * ```
     */
    readonly constraintExcerpt: Excerpt;
    /**
     * An {@link Excerpt} that describes the default type of the type parameter.
     *
     * @remarks
     * In the example below, the `defaultTypeExcerpt` would correspond to the `BarCode` subexpression:
     *
     * ```ts
     * class Book<TIdentifier extends IIdentifier = BarCode> {
     *     public identifier: TIdentifier;
     * }
     * ```
     */
    readonly defaultTypeExcerpt: Excerpt;
    /**
     * The parameter name.
     */
    name: string;
    /**
     * Whether the type parameter is optional. True IFF there exists a `defaultTypeExcerpt`.
     */
    isOptional: boolean;
    private _parent;
    constructor(options: ITypeParameterOptions);
    /**
     * Returns the `@typeParam` documentation for this parameter, if present.
     */
    get tsdocTypeParamBlock(): tsdoc.DocParamBlock | undefined;
}

export { }
