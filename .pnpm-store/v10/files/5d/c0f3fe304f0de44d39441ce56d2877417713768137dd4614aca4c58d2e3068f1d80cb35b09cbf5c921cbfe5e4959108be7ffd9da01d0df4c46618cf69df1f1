// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { StringChecks } from '../parser/StringChecks';
/**
 * Part of the {@link TSDocConfiguration} object.
 *
 * @remarks
 * If you define your own custom subclasses of `DocNode`, they must be registered with the `DocNodeManager`.
 * Use {@link DocNodeManager.registerAllowableChildren} to specify which {@link DocNodeContainer} subclasses
 * are allowed to contain your nodes.
 */
var DocNodeManager = /** @class */ (function () {
    function DocNodeManager() {
        this._docNodeDefinitionsByKind = new Map();
        this._docNodeDefinitionsByConstructor = new Map();
    }
    /**
     * Registers a list of {@link IDocNodeDefinition} objects to be used with the associated
     * {@link TSDocConfiguration} object.
     */
    DocNodeManager.prototype.registerDocNodes = function (packageName, definitions) {
        var packageNameError = StringChecks.explainIfInvalidPackageName(packageName);
        if (packageNameError) {
            throw new Error('Invalid NPM package name: ' + packageNameError);
        }
        for (var _i = 0, definitions_1 = definitions; _i < definitions_1.length; _i++) {
            var definition = definitions_1[_i];
            if (!DocNodeManager._nodeKindRegExp.test(definition.docNodeKind)) {
                throw new Error("The DocNode kind ".concat(JSON.stringify(definition.docNodeKind), " is not a valid identifier.") +
                    " It must start with an underscore or letter, and be comprised of letters, numbers, and underscores");
            }
            var existingDefinition = this._docNodeDefinitionsByKind.get(definition.docNodeKind);
            if (existingDefinition !== undefined) {
                throw new Error("The DocNode kind \"".concat(definition.docNodeKind, "\" was already registered") +
                    " by ".concat(existingDefinition.packageName));
            }
            existingDefinition = this._docNodeDefinitionsByConstructor.get(definition.constructor);
            if (existingDefinition !== undefined) {
                throw new Error("This DocNode constructor was already registered by ".concat(existingDefinition.packageName) +
                    " as ".concat(existingDefinition.docNodeKind));
            }
            var newDefinition = {
                docNodeKind: definition.docNodeKind,
                constructor: definition.constructor,
                packageName: packageName,
                allowedChildKinds: new Set()
            };
            this._docNodeDefinitionsByKind.set(definition.docNodeKind, newDefinition);
            this._docNodeDefinitionsByConstructor.set(definition.constructor, newDefinition);
        }
    };
    /**
     * Reports an error if the specified DocNode kind has not been registered.
     */
    DocNodeManager.prototype.throwIfNotRegisteredKind = function (docNodeKind) {
        if (!this._docNodeDefinitionsByKind.has(docNodeKind)) {
            throw new Error("The DocNode kind \"".concat(docNodeKind, "\" was not registered with this TSDocConfiguration"));
        }
    };
    /**
     * For the given parent DocNode kind, registers the specified DocNode kinds as being allowable children of
     * the parent.
     *
     * @remarks
     * To prevent mistakes, `DocNodeContainer` will report an error if you try to add node that was not registered
     * as an allowable child of the container.
     */
    DocNodeManager.prototype.registerAllowableChildren = function (parentKind, childKinds) {
        var parentDefinition = this._getDefinition(parentKind);
        for (var _i = 0, childKinds_1 = childKinds; _i < childKinds_1.length; _i++) {
            var childKind = childKinds_1[_i];
            this._getDefinition(childKind);
            parentDefinition.allowedChildKinds.add(childKind);
        }
    };
    /**
     * Returns true if the specified DocNode kind has been registered as an allowable child of the specified
     * parent DocNode kind.
     */
    DocNodeManager.prototype.isAllowedChild = function (parentKind, childKind) {
        var parentDefinition = this._getDefinition(parentKind);
        return parentDefinition.allowedChildKinds.has(childKind);
    };
    DocNodeManager.prototype._getDefinition = function (docNodeKind) {
        var definition = this._docNodeDefinitionsByKind.get(docNodeKind);
        if (definition === undefined) {
            throw new Error("The DocNode kind \"".concat(docNodeKind, "\" was not registered with this TSDocConfiguration"));
        }
        return definition;
    };
    // Matches an ASCII TypeScript-style identifier.
    //
    // Example: "_myIdentifier99"
    DocNodeManager._nodeKindRegExp = /^[_a-z][_a-z0-9]*$/i;
    return DocNodeManager;
}());
export { DocNodeManager };
//# sourceMappingURL=DocNodeManager.js.map