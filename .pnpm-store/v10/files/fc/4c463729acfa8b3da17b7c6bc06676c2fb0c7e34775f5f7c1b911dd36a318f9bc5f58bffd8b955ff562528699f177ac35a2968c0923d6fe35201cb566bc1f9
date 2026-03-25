import type { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import type { Constructor, PropertiesOf } from '../mixins/Mixin';
import type { ApiPackage } from '../model/ApiPackage';
import type { DeserializerContext } from '../model/DeserializerContext';
import type { ApiModel } from '../model/ApiModel';
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
/**
 * Constructor options for {@link ApiItem}.
 * @public
 */
export interface IApiItemOptions {
}
export interface IApiItemJson {
    kind: ApiItemKind;
    canonicalReference: string;
}
export declare const apiItem_onParentChanged: unique symbol;
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
/**
 * This abstraction is used by the mixin pattern.
 * It describes a class type that inherits from {@link ApiItem}.
 *
 * @public
 */
export interface IApiItemConstructor extends Constructor<ApiItem>, PropertiesOf<typeof ApiItem> {
}
//# sourceMappingURL=ApiItem.d.ts.map