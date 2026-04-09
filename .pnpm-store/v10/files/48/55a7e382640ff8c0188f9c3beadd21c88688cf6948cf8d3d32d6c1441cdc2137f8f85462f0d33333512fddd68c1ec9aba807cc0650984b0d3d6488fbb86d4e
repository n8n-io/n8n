"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiItemContainerMixin = ApiItemContainerMixin;
/* eslint-disable @typescript-eslint/no-redeclare */
const node_core_library_1 = require("@rushstack/node-core-library");
const ApiItem_1 = require("../items/ApiItem");
const ApiNameMixin_1 = require("./ApiNameMixin");
const Excerpt_1 = require("./Excerpt");
const IFindApiItemsResult_1 = require("./IFindApiItemsResult");
const _members = Symbol('ApiItemContainerMixin._members');
const _membersSorted = Symbol('ApiItemContainerMixin._membersSorted');
const _membersByContainerKey = Symbol('ApiItemContainerMixin._membersByContainerKey');
const _membersByName = Symbol('ApiItemContainerMixin._membersByName');
const _membersByKind = Symbol('ApiItemContainerMixin._membersByKind');
const _preserveMemberOrder = Symbol('ApiItemContainerMixin._preserveMemberOrder');
/**
 * Mixin function for {@link ApiDeclaredItem}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiItemContainerMixin:interface)} functionality.
 *
 * @public
 */
function ApiItemContainerMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            var _a;
            super(...args);
            const options = args[0];
            this[_members] = [];
            this[_membersSorted] = false;
            this[_membersByContainerKey] = new Map();
            this[_preserveMemberOrder] = (_a = options.preserveMemberOrder) !== null && _a !== void 0 ? _a : false;
            if (options.members) {
                for (const member of options.members) {
                    this.addMember(member);
                }
            }
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            options.preserveMemberOrder = jsonObject.preserveMemberOrder;
            options.members = [];
            for (const memberObject of jsonObject.members) {
                options.members.push(ApiItem_1.ApiItem.deserialize(memberObject, context));
            }
        }
        /** @override */
        get members() {
            if (!this[_membersSorted] && !this[_preserveMemberOrder]) {
                this[_members].sort((x, y) => x.getSortKey().localeCompare(y.getSortKey()));
                this[_membersSorted] = true;
            }
            return this[_members];
        }
        get preserveMemberOrder() {
            return this[_preserveMemberOrder];
        }
        addMember(member) {
            if (this[_membersByContainerKey].has(member.containerKey)) {
                throw new Error(`Another member has already been added with the same name (${member.displayName})` +
                    ` and containerKey (${member.containerKey})`);
            }
            const existingParent = member.parent;
            if (existingParent !== undefined) {
                throw new Error(`This item has already been added to another container: "${existingParent.displayName}"`);
            }
            this[_members].push(member);
            this[_membersByName] = undefined; // invalidate the lookup
            this[_membersByKind] = undefined; // invalidate the lookup
            this[_membersSorted] = false;
            this[_membersByContainerKey].set(member.containerKey, member);
            member[ApiItem_1.apiItem_onParentChanged](this);
        }
        tryGetMemberByKey(containerKey) {
            return this[_membersByContainerKey].get(containerKey);
        }
        findMembersByName(name) {
            this._ensureMemberMaps();
            return this[_membersByName].get(name) || [];
        }
        findMembersWithInheritance() {
            const messages = [];
            let maybeIncompleteResult = false;
            // For API items that don't support inheritance, this method just returns the item's
            // immediate members.
            switch (this.kind) {
                case ApiItem_1.ApiItemKind.Class:
                case ApiItem_1.ApiItemKind.Interface:
                    break;
                default: {
                    return {
                        items: this.members.concat(),
                        messages,
                        maybeIncompleteResult
                    };
                }
            }
            const membersByName = new Map();
            const membersByKind = new Map();
            const toVisit = [];
            let next = this;
            while (next) {
                const membersToAdd = [];
                // For each member, check to see if we've already seen a member with the same name
                // previously in the inheritance tree. If so, we know we won't inherit it, and thus
                // do not add it to our `membersToAdd` array.
                for (const member of next.members) {
                    // We add the to-be-added members to an intermediate array instead of immediately
                    // to the maps themselves to support method overloads with the same name.
                    if (ApiNameMixin_1.ApiNameMixin.isBaseClassOf(member)) {
                        if (!membersByName.has(member.name)) {
                            membersToAdd.push(member);
                        }
                    }
                    else {
                        if (!membersByKind.has(member.kind)) {
                            membersToAdd.push(member);
                        }
                    }
                }
                for (const member of membersToAdd) {
                    if (ApiNameMixin_1.ApiNameMixin.isBaseClassOf(member)) {
                        const members = membersByName.get(member.name) || [];
                        members.push(member);
                        membersByName.set(member.name, members);
                    }
                    else {
                        const members = membersByKind.get(member.kind) || [];
                        members.push(member);
                        membersByKind.set(member.kind, members);
                    }
                }
                // Interfaces can extend multiple interfaces, so iterate through all of them.
                const extendedItems = [];
                let extendsTypes;
                switch (next.kind) {
                    case ApiItem_1.ApiItemKind.Class: {
                        const apiClass = next;
                        extendsTypes = apiClass.extendsType ? [apiClass.extendsType] : [];
                        break;
                    }
                    case ApiItem_1.ApiItemKind.Interface: {
                        const apiInterface = next;
                        extendsTypes = apiInterface.extendsTypes;
                        break;
                    }
                }
                if (extendsTypes === undefined) {
                    messages.push({
                        messageId: IFindApiItemsResult_1.FindApiItemsMessageId.UnsupportedKind,
                        text: `Unable to analyze references of API item ${next.displayName} because it is of unsupported kind ${next.kind}`
                    });
                    maybeIncompleteResult = true;
                    next = toVisit.shift();
                    continue;
                }
                for (const extendsType of extendsTypes) {
                    // We want to find the reference token associated with the actual inherited declaration.
                    // In every case we support, this is the first reference token. For example:
                    //
                    // ```
                    // export class A extends B {}
                    //                        ^
                    // export class A extends B<C> {}
                    //                        ^
                    // export class A extends B.C {}
                    //                        ^^^
                    // ```
                    const firstReferenceToken = extendsType.excerpt.spannedTokens.find((token) => {
                        return token.kind === Excerpt_1.ExcerptTokenKind.Reference && token.canonicalReference;
                    });
                    if (!firstReferenceToken) {
                        messages.push({
                            messageId: IFindApiItemsResult_1.FindApiItemsMessageId.ExtendsClauseMissingReference,
                            text: `Unable to analyze extends clause ${extendsType.excerpt.text} of API item ${next.displayName} because no canonical reference was found`
                        });
                        maybeIncompleteResult = true;
                        continue;
                    }
                    const apiModel = this.getAssociatedModel();
                    if (!apiModel) {
                        messages.push({
                            messageId: IFindApiItemsResult_1.FindApiItemsMessageId.NoAssociatedApiModel,
                            text: `Unable to analyze references of API item ${next.displayName} because it is not associated with an ApiModel`
                        });
                        maybeIncompleteResult = true;
                        continue;
                    }
                    const canonicalReference = firstReferenceToken.canonicalReference;
                    const apiItemResult = apiModel.resolveDeclarationReference(canonicalReference, undefined);
                    const apiItem = apiItemResult.resolvedApiItem;
                    if (!apiItem) {
                        messages.push({
                            messageId: IFindApiItemsResult_1.FindApiItemsMessageId.DeclarationResolutionFailed,
                            text: `Unable to resolve declaration reference within API item ${next.displayName}: ${apiItemResult.errorMessage}`
                        });
                        maybeIncompleteResult = true;
                        continue;
                    }
                    extendedItems.push(apiItem);
                }
                // For classes, this array will only have one item. For interfaces, there may be multiple items. Sort the array
                // into alphabetical order before adding to our list of API items to visit. This ensures that in the case
                // of multiple interface inheritance, a member inherited from multiple interfaces is attributed to the interface
                // earlier in alphabetical order (as opposed to source order).
                //
                // For example, in the code block below, `Bar.x` is reported as the inherited item, not `Foo.x`.
                //
                // ```
                // interface Foo {
                //   public x: string;
                // }
                //
                // interface Bar {
                //   public x: string;
                // }
                //
                // interface FooBar extends Foo, Bar {}
                // ```
                extendedItems.sort((x, y) => x.getSortKey().localeCompare(y.getSortKey()));
                toVisit.push(...extendedItems);
                next = toVisit.shift();
            }
            const items = [];
            for (const members of membersByName.values()) {
                items.push(...members);
            }
            for (const members of membersByKind.values()) {
                items.push(...members);
            }
            items.sort((x, y) => x.getSortKey().localeCompare(y.getSortKey()));
            return {
                items,
                messages,
                maybeIncompleteResult
            };
        }
        /** @internal */
        _getMergedSiblingsForMember(memberApiItem) {
            this._ensureMemberMaps();
            let result;
            if (ApiNameMixin_1.ApiNameMixin.isBaseClassOf(memberApiItem)) {
                result = this[_membersByName].get(memberApiItem.name);
            }
            else {
                result = this[_membersByKind].get(memberApiItem.kind);
            }
            if (!result) {
                throw new node_core_library_1.InternalError('Item was not found in the _membersByName/_membersByKind lookup');
            }
            return result;
        }
        /** @internal */
        _ensureMemberMaps() {
            // Build the _membersByName and _membersByKind tables if they don't already exist
            if (this[_membersByName] === undefined) {
                const membersByName = new Map();
                const membersByKind = new Map();
                for (const member of this[_members]) {
                    let map;
                    let key;
                    if (ApiNameMixin_1.ApiNameMixin.isBaseClassOf(member)) {
                        map = membersByName;
                        key = member.name;
                    }
                    else {
                        map = membersByKind;
                        key = member.kind;
                    }
                    let list = map.get(key);
                    if (list === undefined) {
                        list = [];
                        map.set(key, list);
                    }
                    list.push(member);
                }
                this[_membersByName] = membersByName;
                this[_membersByKind] = membersByKind;
            }
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            const memberObjects = [];
            for (const member of this.members) {
                const memberJsonObject = {};
                member.serializeInto(memberJsonObject);
                memberObjects.push(memberJsonObject);
            }
            jsonObject.preserveMemberOrder = this.preserveMemberOrder;
            jsonObject.members = memberObjects;
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiItemContainerMixin:interface)}.
 * @public
 */
(function (ApiItemContainerMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiItemContainerMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_members);
    }
    ApiItemContainerMixin.isBaseClassOf = isBaseClassOf;
})(ApiItemContainerMixin || (exports.ApiItemContainerMixin = ApiItemContainerMixin = {}));
//# sourceMappingURL=ApiItemContainerMixin.js.map