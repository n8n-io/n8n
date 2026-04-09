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
export class DocNodeManager {
    constructor() {
        this._docNodeDefinitionsByKind = new Map();
        this._docNodeDefinitionsByConstructor = new Map();
    }
    /**
     * Registers a list of {@link IDocNodeDefinition} objects to be used with the associated
     * {@link TSDocConfiguration} object.
     */
    registerDocNodes(packageName, definitions) {
        const packageNameError = StringChecks.explainIfInvalidPackageName(packageName);
        if (packageNameError) {
            throw new Error('Invalid NPM package name: ' + packageNameError);
        }
        for (const definition of definitions) {
            if (!DocNodeManager._nodeKindRegExp.test(definition.docNodeKind)) {
                throw new Error(`The DocNode kind ${JSON.stringify(definition.docNodeKind)} is not a valid identifier.` +
                    ` It must start with an underscore or letter, and be comprised of letters, numbers, and underscores`);
            }
            let existingDefinition = this._docNodeDefinitionsByKind.get(definition.docNodeKind);
            if (existingDefinition !== undefined) {
                throw new Error(`The DocNode kind "${definition.docNodeKind}" was already registered` +
                    ` by ${existingDefinition.packageName}`);
            }
            existingDefinition = this._docNodeDefinitionsByConstructor.get(definition.constructor);
            if (existingDefinition !== undefined) {
                throw new Error(`This DocNode constructor was already registered by ${existingDefinition.packageName}` +
                    ` as ${existingDefinition.docNodeKind}`);
            }
            const newDefinition = {
                docNodeKind: definition.docNodeKind,
                constructor: definition.constructor,
                packageName,
                allowedChildKinds: new Set()
            };
            this._docNodeDefinitionsByKind.set(definition.docNodeKind, newDefinition);
            this._docNodeDefinitionsByConstructor.set(definition.constructor, newDefinition);
        }
    }
    /**
     * Reports an error if the specified DocNode kind has not been registered.
     */
    throwIfNotRegisteredKind(docNodeKind) {
        if (!this._docNodeDefinitionsByKind.has(docNodeKind)) {
            throw new Error(`The DocNode kind "${docNodeKind}" was not registered with this TSDocConfiguration`);
        }
    }
    /**
     * For the given parent DocNode kind, registers the specified DocNode kinds as being allowable children of
     * the parent.
     *
     * @remarks
     * To prevent mistakes, `DocNodeContainer` will report an error if you try to add node that was not registered
     * as an allowable child of the container.
     */
    registerAllowableChildren(parentKind, childKinds) {
        const parentDefinition = this._getDefinition(parentKind);
        for (const childKind of childKinds) {
            this._getDefinition(childKind);
            parentDefinition.allowedChildKinds.add(childKind);
        }
    }
    /**
     * Returns true if the specified DocNode kind has been registered as an allowable child of the specified
     * parent DocNode kind.
     */
    isAllowedChild(parentKind, childKind) {
        const parentDefinition = this._getDefinition(parentKind);
        return parentDefinition.allowedChildKinds.has(childKind);
    }
    _getDefinition(docNodeKind) {
        const definition = this._docNodeDefinitionsByKind.get(docNodeKind);
        if (definition === undefined) {
            throw new Error(`The DocNode kind "${docNodeKind}" was not registered with this TSDocConfiguration`);
        }
        return definition;
    }
}
// Matches an ASCII TypeScript-style identifier.
//
// Example: "_myIdentifier99"
DocNodeManager._nodeKindRegExp = /^[_a-z][_a-z0-9]*$/i;
//# sourceMappingURL=DocNodeManager.js.map