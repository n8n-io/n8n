import { ApiItem, type IApiItemJson, type IApiItemOptions, type IApiItemConstructor } from '../items/ApiItem';
import { type IFindApiItemsResult } from './IFindApiItemsResult';
/**
 * Constructor options for {@link (ApiItemContainerMixin:interface)}.
 * @public
 */
export interface IApiItemContainerMixinOptions extends IApiItemOptions {
    preserveMemberOrder?: boolean;
    members?: ApiItem[];
}
export interface IApiItemContainerJson extends IApiItemJson {
    preserveMemberOrder?: boolean;
    members: IApiItemJson[];
}
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
export interface ApiItemContainerMixin extends ApiItem {
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
 * Mixin function for {@link ApiDeclaredItem}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiItemContainerMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiItemContainerMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiItemContainerMixin);
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
    function isBaseClassOf(apiItem: ApiItem): apiItem is ApiItemContainerMixin;
}
//# sourceMappingURL=ApiItemContainerMixin.d.ts.map